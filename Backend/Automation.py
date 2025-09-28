
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
            model = 'mixtral-8x7b-32768',
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

    Topic: str = Topic.replace("Content ", "") 
    ContentByAI = ContentWriterAI(Topic)  

    
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
            link = extract_links(html)[0]
            webopen(link)
        return True
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
    funcs = []
    for command in commands:
        if command.startswith("open "):
            if "open it" in command:
                pass
            if "open file" == command:
                pass
            else:
                fun = asyncio.to_thread(OpenApp , command.removeprefix("open "))
                funcs.append(fun)
        elif command.startswith("general "):
            pass
        elif command.startswith("realtime "):
            pass
        elif command.startswith("close "):
            fun = asyncio.to_thread(closeApp , command.removeprefix("close "))
            funcs.append(fun)
        elif command.startswith("play "):
            fun = asyncio.to_thread(PlayYoutube , command.removeprefix("play "))
            funcs.append(fun)
        elif command.startswith("content "):
            fun = asyncio.to_thread(content , command.removeprefix("content "))
            funcs.append(fun)
        elif command.startswith("search "):
            fun = asyncio.to_thread(GoogleSearch, command.removeprefix("google search "))
            funcs.append(fun)
        elif command.startswith("youtube search "):
            fun = asyncio.to_thread(YouTubeSearch , command.removeprefix("youtube search "))
            funcs.append(fun)
        elif command.startswith("system "):
            fun = asyncio.to_thread(System , command.removeprefix("system "))
            funcs.append(fun)
        else:
            print(f"No such function found.For {command}")
        
    results = await asyncio.gather(*funcs)
    for result in results:
        if isinstance(result, str):
            yield result
        else:
            yield results
    
async def automation(commands: list[str]):
    async for result in TranslateAndExecute(commands):
        pass
    return True