from groq import Groq
from json import dump, load
from dotenv import dotenv_values
from GeneralQueries import RealtimeInformation, AnswerModifier
import os # <-- NEW IMPORT

# --- ROBUST PATH CALCULATION ---
# 1. Get the absolute directory of the current file (Backend/)
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__)) 
# 2. Get the parent directory (Project Root/)
PROJECT_ROOT = os.path.dirname(CURRENT_DIR) 
# 3. Construct the full path to the log file (Project Root/Data/ChatLog.json)
LOG_FILE_PATH = os.path.join(PROJECT_ROOT, "Data", "ChatLog.json")
# -------------------------------

env_vars = dotenv_values(".env")
Username = env_vars.get("USERNAME")
AssistantName = env_vars.get("ASSISTANT_NAME")
GroqAPIKey = env_vars.get("GROQ_API_KEY")
print(GroqAPIKey)
client = Groq(api_key=GroqAPIKey)

System = f"""Hello, I am {Username}, You are a very accurate and advanced AI chatbot named {AssistantName} which has real-time up-to-date information from the internet.
*** Provide Answers In a Professional Way, make sure to add full stops, commas, question marks, and use proper grammar.***
*** Provide concise, summarized answers in 3-5 lines only. Be brief and to the point while maintaining professionalism.***
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
        # FIX 1: Use the robust LOG_FILE_PATH
        with open(LOG_FILE_PATH, "r") as f:
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
        max_tokens=300,  # Reduced to ensure concise 3-5 line responses
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
    
    # FIX 2: Use the robust LOG_FILE_PATH
    with open(LOG_FILE_PATH, "w") as f:
        dump(messages, f, indent=4)
    
    # Process and limit to 3-5 lines
    modified_answer = AnswerModifier(Answer)
    lines = modified_answer.split('\n')
    non_empty_lines = [line.strip() for line in lines if line.strip()]
    # Take first 5 lines, but prefer 3-5 lines
    summarized_answer = '\n'.join(non_empty_lines[:5])
    
    return summarized_answer

if __name__ == "__main__":
    while True:
        query = input("User: ")
        print(ChatBot(query))