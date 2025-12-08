
from AppOpener import close, open as appopen
from webbrowser import open as webopen
from pywhatkit import search, playonyt
from dotenv import dotenv_values  
from bs4 import BeautifulSoup 
from rich import print 
from groq import Groq 
import webbrowser  
import subprocess 
import requests 
import keyboard 
import asyncio 
import os  
import asyncio 
import os  
from GeneralQueries import RealtimeSearchEngine
from ChatBot import ChatBot

env_vars = dotenv_values(".env")
GroqAPIKey = env_vars.get("GROQ_API_KEY")

useragent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36'

client = Groq(api_key=GroqAPIKey)

professional_responses = [
    "Your satisfaction is my top priority; feel free to reach out if there’s anything else I can help you with.",
    "I'm at your service for any additional questions or support you may need—don’t hesitate to ask.",
]

messages = []

SystemChatBot = [{"role": "system", "content": f"Hello, I am {os.environ['Username']}, You're a content writer. You have to write content like lette"}]

def GoogleSearch(Topic):
    search(Topic)  
    return True

# def YouTubeSearch(Topic):
#     playonyt(Topic)  
#     return True

def content(topic):
    def openNotepad(File):
        default_text_Editor = 'notepad.exe'
        subprocess.Popen([default_text_Editor, File])
    def contentWriteAI(prompt):
        messages.append({"role": "user", "content": prompt})
        completion = client.chat.completions.create(
            model = 'llama-3.3-70b-versatile',
            messages = SystemChatBot+ messages,
            max_tokens = 2048,
            temperature = 0.7,
            top_p = 1,
            stream = True,
            stop = None 
        )
        Answer = ""
        
        for chunk in completion:
            if chunk.choices[0].delta.content:  
                Answer += chunk.choices[0].delta.content 

        Answer = Answer.replace("</s>", "")  
        messages.append({"role": "assistant", "content": Answer})  
        return Answer

    Topic: str = topic.replace("Content ", "") 
    ContentByAI = contentWriteAI(Topic)  

    
    import os
    if not os.path.exists("Data"):
        os.makedirs("Data")
    
    with open(rf"Data\{Topic.lower().replace(' ', '')}.txt", "w", encoding="utf-8") as file:
        file.write(ContentByAI)  
        file.close()
    openNotepad(rf'Data\{Topic.lower().replace(" ", "")}.txt')
    return True
def YouTubeSearch(Topic):
    Url4Search = f"https://www.youtube.com/results?search_query={Topic}"
    webbrowser.open(Url4Search)
    return True

def PlayYoutube(query):
    playonyt(query)
    return True

def WebOpen(url):
    """Opens a URL using the default web browser."""
    # Prepend 'http://' if the URL doesn't start with a protocol
    if not (url.startswith('http://') or url.startswith('https://')):
        url = 'http://' + url
    webopen(url)
    return True

def classify_command_type(command: str) -> str:
    """Uses Groq to classify the command as 'open app' or 'open url'."""
    try:
        prompt = (
            f"The user wants to open something with the command: '{command}'. "
            "Is the target an APPLICATION (like 'Discord', 'Steam', 'VS Code') or "
            "a WEBSITE URL (like 'netflix.com', 'google.com', 'http://youtube.com')? "
            "Reply with *only* one of the following two words: 'app' or 'url'."
        )
        
        # Use a new, minimal message list for this simple query
        completion = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{"role": "user", "content": prompt}],
            max_tokens=5, # Keep the response very short
            temperature=0.0, # Get a deterministic classification
        )
        classification = completion.choices[0].message.content.strip().lower()
        
        if 'url' in classification:
            return 'url'
        else:
            # Default to 'app' if the classification is unclear or if the model
            # returns anything other than a clear 'url'.
            return 'app'
            
    except Exception as e:
        print(f"LLM classification failed: {e}. Defaulting to 'app' behavior.")
        return 'app'

def OpenApp(app_name, sess=requests.Session()):
    try:
        appopen(app_name,match_closest=True , output=True , throw_error=True)
        return True
    except:
        def extract_links(html):
            if html is None:
                return []
            soup = BeautifulSoup(html, 'html.parser')
            links = soup.find_all('a' , {'jsname' : 'UQckNb'})
            return [link.get('href') for link in links if link.get('href')]
        
        def search_google(query):
            url = f"https://www.google.com/search?q={query}"
            headers = {'User-Agent': useragent}
            response = sess.get(url, headers=headers)
            
            if response.status_code == 200:
                return response.text
            else:
                print("Failed to retrive results")
        html = search_google(app_name)
        
        if html:
            links = extract_links(html)
            if links:
                link = links[0]
                webopen(link)
                return True
            else:
                print(f"No valid links found for {app_name}")
            
            return False
            
def closeApp(app_name):
        if "chrome" in app_name:
            pass
        else:
            try:
                close(app_name, match_closest=True, output=True, throw_error=True)
                return True
            except:
                return False
def System(command):
    
        def mute():
            keyboard.press_and_release("volume mute")
        def volume_up():
            keyboard.press_and_release("volume up")
        def unmute():
            keyboard.press_and_release("volume unmute")
        def volume_down():
            keyboard.press_and_release("volume down")
        # def lock():
        #     subprocess.call("rundll32.exe powrprof.dll,SetSuspendState 0,1,0")
        # def restart():
        #     subprocess.call("shutdown /r /t 0")
        # def shutdown():
        #     subprocess.call("shutdown /s /t 0")
        # #sleep
        # def sleep():
        #     subprocess.call("rundll32.exe powrprof.dll,SetSuspendState 0,1,0"   
        if command == "mute":
            mute()
        elif command == "volume up":
            volume_up()
        elif command == "unmute":
            unmute()
        elif command == "volume down":
            volume_down()
        return True

async def TranslateAndExecute(commands: list[str]):
    tasks = []  # List of output strings
    funcs = []  # List of functions to execute
    
    for command in commands:
        if command.startswith("open "):
            # --- START of MODIFIED OPEN LOGIC ---
            target = command.removeprefix("open ").strip()
            
            # 1. Classify the intent
            command_type = await asyncio.to_thread(classify_command_type, target)
            
            if command_type == 'url':
                print(f"Classified '{target}' as a URL. Opening in browser...")
                fun = asyncio.to_thread(WebOpen , target)
                funcs.append(fun)
                tasks.append(f"opening {target}")
            else:
                print(f"Classified '{target}' as an Application. Attempting to open app...")
                fun = asyncio.to_thread(OpenApp , target)
                funcs.append(fun)
                tasks.append(f"opening {target}")

        elif command.startswith("general "):
            fun = asyncio.to_thread(ChatBot , command.removeprefix("general "))
            funcs.append(fun)
            tasks.append("general")  # Marker for special handling
        elif command.startswith("realtime "):
            fun = asyncio.to_thread(RealtimeSearchEngine, command.removeprefix("realtime "))
            funcs.append(fun)
            tasks.append("realtime")  # Marker for special handling
        elif command.startswith("close "):
            fun = asyncio.to_thread(closeApp , command.removeprefix("close "))
            funcs.append(fun)
            tasks.append(f"closing {command.removeprefix("close ")}")
        elif command.startswith("play "):
            fun = asyncio.to_thread(PlayYoutube , command.removeprefix("play "))
            funcs.append(fun)
            tasks.append(f"playing {command.removeprefix("play ")}")
        elif command.startswith("content "):
            fun = asyncio.to_thread(content , command.removeprefix("content "))
            funcs.append(fun)
            tasks.append(f"writing {command.removeprefix("content ")}")
        elif command.startswith("search "):
            fun = asyncio.to_thread(GoogleSearch, command.removeprefix("search "))
            funcs.append(fun)
            tasks.append(f"searching {command.removeprefix("search ")}")
        elif command.startswith("youtube search "):
            fun = asyncio.to_thread(YouTubeSearch , command.removeprefix("youtube search "))
            funcs.append(fun)
            tasks.append(f"youtube search {command.removeprefix("youtube search ")}")
        elif command.startswith("system "):
            fun = asyncio.to_thread(System , command.removeprefix("system "))
            funcs.append(fun)
            tasks.append(command.removeprefix("system "))
        else:
            print(f"No such function found.For {command}")
        
    if not tasks:
        return
    
    # Execute all tasks
    results = await asyncio.gather(*funcs)
    
    # Update tasks array with actual responses for general/realtime
    for i, (result, task_output) in enumerate(zip(results, tasks)):
        if task_output == "general" or task_output == "realtime":
            # Extract first 3 lines from the output and replace in tasks array
            if isinstance(result, str) and result.strip():
                # Split by newlines and get first 3 non-empty lines
                lines = result.split('\n')
                non_empty_lines = [line.strip() for line in lines if line.strip()]
                first_three_lines = ' '.join(non_empty_lines[:3])  # Join with space, remove \n
                # Remove any remaining newline characters
                first_three_lines = first_three_lines.replace('\n', ' ').replace('\r', ' ')
                # Clean up multiple spaces
                first_three_lines = ' '.join(first_three_lines.split())
                if first_three_lines:
                    tasks[i] = first_three_lines
                else:
                    tasks[i] = result[:200].replace('\n', ' ').replace('\r', ' ') if result else "No response"
            else:
                tasks[i] = str(result)[:200].replace('\n', ' ').replace('\r', ' ') if result else "No response"
    
    # Print tasks array for debugging (remove later) - after update
    print("TASKS ARRAY:", tasks)
    
    # Process results and yield appropriate output
    for task_output in tasks:
        yield task_output
    
async def automation(commands: list[str]):
    async for result in TranslateAndExecute(commands):
        pass
    return True

# if __name__ == "__main__":
    # print("Testing GoogleSearch...")
    # result = GoogleSearch("Python programming")  # This should open a browser/search
    # print(f"GoogleSearch result: {result}")  # Will print True
    
    # # Example: Test async automation (requires a commands list)
    # import asyncio
    # commands = [ "What new smartphones were launched this week?"]  # Sample commands
    # print("Running automation...")
    # asyncio.run(automation(commands))
    # print("Automation complete.")   
    # asyncio.run(automation(["search python frameworks" ,"open microsoft store", "realtime live price of ibm"]))
    
