import requests

url = "https://open.bigmodel.cn/api/paas/v4/chat/completions"

headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer 71722b34ddd54c278fd376dd2c484b6f.gvQOT6O0YlVVENwn"
}

data = {
    "model": "glm-4.5",
    "messages": [
        {"role": "user", "content": "hello"}
    ]
}

resp = requests.post(url, json=data, headers=headers, timeout=30)
print("status:", resp.status_code)
print("body:", resp.text)
