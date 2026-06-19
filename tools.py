from langchain.tools import tool
import requests
from bs4 import BeautifulSoup
from tavily import TavilyClient
import os
from dotenv import load_dotenv
from rich import print 

load_dotenv()

tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

# tavily search internt
@tool
def web_search(query: str) -> str:
    """Search the web for recent and reliable infromation on a topic. Returns Titles , URLs , Snippet"""

    result = tavily.search(query= query, max_results=5)

    result_list = []

    for r in result['results']:
        result_list.append(
            f"Title: {r['title']}\nURL: {r['url']}\nSnippet: {r['content'][:300]}\n"
        )

    return "\n----\n".join(result_list)

# print(web_search.invoke("News of Fifa 2026"))

# bs4 exrtact things
@tool
def scrape_url(url : str)-> str:
    """Scrape and return clean text content from a given URL for deeper reading."""
    try:
        response = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(response.text, "html.parser")

        for tag in soup(["scipt","style","nav","footer"]):
            tag.decompose()
        return soup.get_text(separator=" ", strip=True)[:3000]
    except Exception as e:
        return f"Could not Scrape URL: {str(e)}"
    
# print(scrape_url.invoke("https://apnews.com/hub/fifa-world-cup"))