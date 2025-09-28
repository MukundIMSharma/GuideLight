from googlesearch import search
from groq import Groq
from json import dump, load
import datetime
from dotenv import dotenv_values

env_vars = dotenv_values(".env")

Username = env_vars.get("USERNAME")
AssistantName = env_vars.get("ASSISTANT_NAME")
GroqAPIKey = env_vars.get("GROQ_API_KEY")

client = Groq(api_key=GroqAPIKey)  

System = f"""Hello, I am {Username}, You are a very accurate and advanced AI chatbot named {AssistantName} which has real-time up-to-date information from the internet.
*** Provide Answers In a Professional Way, make sure to add full stops, commas, question marks, and use proper grammar.***
*** Just answer the question from the provided data in a professional way.***
"""

try:
    with open(r"Data/ChatLog.json" , "r") as f:
        messages = load(f)
except :
    with open(r"Data/ChatLog.json" , "w") as f:
        dump([] , f)

def GoogleSearch(query):
    results = list(search(query,advanced=True , num_results=5))
    Answers = f'the search results for "{query} are  :'
    
    for i in results:
        Answers += f"Title: {i.title}\nDescription: {i.description}\n\n"
    
    Answers += "[end]"
    return Answers

# output is answer(S) for asked query 

def AnswerModifier(answer):
    lines = answer.split("\n")
    non_Empty_lines = [line for line in lines if line.strip()] #trailing white spaces
    modified_Ans = "\n".join(non_Empty_lines) 
    return modified_Ans

SystemChatBot = [
    {"role": "system", "content": System},
    {"role": "user" , "content": "Hi"},
    {"role" : "assistant" , "content": "Hello, How can I help you?"}
] 

def Information():
    data = ""
    current_date_time = datetime.datetime.now()
    day = current_date_time.strftime("%A")
    date = current_date_time.strftime("%d")
    month = current_date_time.strftime("%B")
    year = current_date_time.strftime("%Y")
    hour = current_date_time.strftime("%H")
    minute = current_date_time.strftime("%M")
    second = current_date_time.strftime("%S")

    data += f"Use This Real-time Information if needed:\n"
    data += f"Day: {day}\n"
    data += f"Date: {date}\n"
    data += f"Month: {month}\n"
    data += f"Year: {year}\n"
    data += f"Time: {hour} hours, {minute} minutes, {second} seconds.\n"
    
    return data

def RealtimeSearchEngine(prompt):
    global SystemChatBot, messages
    with open(r"Data/ChatLog.json", "r") as f:
        messages = load(f)
    messages.append({"role": "user", "content": f"{prompt}"})
    SystemChatBot.append({"role": "system", "content": GoogleSearch(prompt)})
    completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",  # Specify the AI model to use.
                messages=SystemChatBot + [{"role": "user", "content": Information()}] + [{"role": "user", "content": GoogleSearch(prompt)}]+ messages,# sys instruction  + realtime info + chat history
                max_tokens=512,  # Limit the maximum tokens in the response.
                temperature=0.7,  # Adjust response randomness (higher means more random).
                top_p=1,  # Use nucleus sampling to control diversity.
                stream=True,  # Enable streaming response.
                 # Allow the model to determine when to stop.
            )
    Answer = ""  #AI response
    for chunk in completion:
        if chunk.choices[0].delta.content:
            Answer += chunk.choices[0].delta.content
    Answer = Answer.replace("</s>", "") 
    messages.append({"role": "assistant", "content": Answer})      
    
    with open(r"Data/ChatLog.json", "w") as f:
        dump(messages, f, indent=4)  # Save the updated chat history to the file.
        
    
    return AnswerModifier(Answer)  # Return the modified answer.

if __name__ == "__main__":
    while True:
        prompt = input("Enter your query: ")
        print(RealtimeSearchEngine(prompt))