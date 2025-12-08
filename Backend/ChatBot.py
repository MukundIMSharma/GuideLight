from groq import Groq
from json import dump, load
from dotenv import dotenv_values
from GeneralQueries import RealtimeInformation, AnswerModifier

env_vars = dotenv_values(".env")
Username = env_vars.get("USERNAME")
AssistantName = env_vars.get("ASSISTANT_NAME")
GroqAPIKey = env_vars.get("GROQ_API_KEY")

client = Groq(api_key=GroqAPIKey)

System = f"""Hello, I am {Username}, You are a very accurate and advanced AI chatbot named {AssistantName} which has real-time up-to-date information from the internet.
*** Provide Answers In a Professional Way, make sure to add full stops, commas, question marks, and use proper grammar.***
*** Just answer the question from the provided data in a professional way.***
"""

# Initial System/Context messages (always sent)
SystemChatBot = [
    {"role": "system", "content": System},
    {"role": "user", "content": "Hi"},
    {"role": "assistant", "content": "Hello, How can I help you?"}
]

# --- History Management Configuration ---
# Set a limit for the number of *recent* messages to include from ChatLog.json.
# Each user/assistant exchange is 2 messages, so 10 keeps the last 5 exchanges.
# Adjust this number based on your observed token usage.
MAX_HISTORY_MESSAGES = 10 
# ---------------------------------------

def ChatBot(query):
    global SystemChatBot
    
    try:
        with open(r"Data/ChatLog.json", "r") as f:
            messages = load(f)
    except FileNotFoundError:
        messages = []

    # 1. Truncate History: Keep only the most recent messages.
    # We take the last MAX_HISTORY_MESSAGES. If the list is shorter, we take all.
    # This prevents the chat history from growing indefinitely and hitting the token limit.
    recent_history = messages[-MAX_HISTORY_MESSAGES:]

    # 2. Append the current user query to the recent history
    recent_history.append({"role": "user", "content": f"{query}"})
    
    # 3. Construct the full message list for the API call
    # SystemChatBot (fixed setup) + Realtime Info (system prompt) + recent_history (context)
    full_messages = SystemChatBot + [{"role": "system", "content": RealtimeInformation()}] + recent_history
    
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile", 
        messages=full_messages, # Use the truncated history list
        max_tokens=1024,
        temperature=0.7,
        top_p=1,
        stream=True,
        stop=None
    )
    
    Answer = ""
    for chunk in completion:
        if chunk.choices[0].delta.content:
            Answer += chunk.choices[0].delta.content
            
    Answer = Answer.replace("</s>", "")
    
    # 4. Update the full chat log file (messages) with the new exchange
    # We update the *full* messages list (messages) to preserve the log, even if it's truncated for the API call.
    messages.append({"role": "user", "content": f"{query}"})
    messages.append({"role": "assistant", "content": Answer})
    
    with open(r"Data/ChatLog.json", "w") as f:
        dump(messages, f, indent=4)
        
    return AnswerModifier(Answer)

if __name__ == "__main__":
    while True:
        query = input("User: ")
        print(ChatBot(query))