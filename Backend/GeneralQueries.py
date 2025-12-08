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

def GoogleSearch(query: str) -> str:
    """
    Fetch top search results and return a compact, model-friendly block.
    Includes title, URL, and snippet; returns a clear fallback if empty.
    """
    try:
        results = list(search(query, advanced=True, num_results=5))
    except Exception as exc:
        return f'Search unavailable: {exc}'

    if not results:
        return "No search results found."

    lines = [f'SEARCH RESULTS for "{query}":']
    for idx, item in enumerate(results, start=1):
        title = getattr(item, "title", "").strip()
        desc = getattr(item, "description", "").strip()
        url = getattr(item, "url", "") or getattr(item, "link", "")
        lines.append(f"{idx}. Title: {title}")
        if url:
            lines.append(f"   URL: {url}")
        if desc:
            lines.append(f"   Snippet: {desc}")
    lines.append("[end of search results]")
    return "\n".join(lines)

# output is answer(S) for asked query 

def AnswerModifier(answer):
    lines = answer.split("\n")
    non_Empty_lines = [line for line in lines if line.strip()] #trailing white spaces
    modified_Ans = "\n".join(non_Empty_lines) 
    return modified_Ans

BASE_SYSTEM_CHATBOT = [
    {
        "role": "system",
        "content": System
        + "\nUse the provided search results and realtime info only; if results are missing or empty, say you could not find live data.",
    }
] 


    
def RealtimeInformation():
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



def _build_messages(prompt: str, search_results: str) -> list[dict]:
    """
    Build a bounded message list to stay within Groq TPM limits.
    Keeps only the most recent conversation turns and avoids mutating globals.
    """
    global messages
    with open(r"Data/ChatLog.json", "r") as f:
        messages = load(f)

    # Keep only the last 5 messages to control token usage
    recent_history = messages[-5:] if isinstance(messages, list) else []

    # Start with the static system preamble and greeting
    convo = BASE_SYSTEM_CHATBOT.copy()

    # Add fresh realtime context and search results as explicit user content
    convo.append({"role": "system", "content": RealtimeInformation()})
    convo.append({"role": "user", "content": search_results})

    # Add recent history and the current user prompt
    convo.extend(recent_history)
    convo.append({"role": "user", "content": prompt})

    # If still too large, trim older history further based on character length
    def convo_size(msgs: list[dict]) -> int:
        return sum(len(str(m.get("content", ""))) for m in msgs)

    while len(recent_history) > 2 and convo_size(convo) > 8000:
        recent_history = recent_history[2:]  # drop the oldest two entries
        convo = BASE_SYSTEM_CHATBOT.copy()
        convo.append({"role": "system", "content": RealtimeInformation()})
        convo.append({"role": "user", "content": search_results})
        convo.extend(recent_history)
        convo.append({"role": "user", "content": prompt})

    return convo


def RealtimeSearchEngine(prompt):
    global messages
    search_results = GoogleSearch(prompt)
    message_payload = _build_messages(prompt, search_results)

    if not isinstance(messages, list):
        messages = []
    messages.append({"role": "user", "content": prompt})

    completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",  
                messages=message_payload,
                max_tokens=640,
                temperature=0.7,
                top_p=1,
                stream=True,
            )
    Answer = ""  #AI response
    for chunk in completion:
        if chunk.choices[0].delta.content:
            Answer += chunk.choices[0].delta.content
    Answer = Answer.replace("</s>", "") 
    messages.append({"role": "assistant", "content": Answer})      
    
    with open(r"Data/ChatLog.json", "w") as f:
        dump(messages, f, indent=4)  # Save the updated chat history to the file.
        
    
    return AnswerModifier(Answer)  # Return the modified answer. returns string

if __name__ == "__main__":
    while True:
        prompt = input("Enter your query: ")
        print(RealtimeSearchEngine(prompt))