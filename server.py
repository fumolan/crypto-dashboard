#!/usr/bin/env python3
# Crypto Dashboard 本地服务
# 用法: python3 server.py  →  浏览器打开 http://localhost:8765
# 作用: ① 提供页面  ② 接收页面导出的md文件, 直接写进本文件夹
import json
import os
import re
from http.server import HTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)


class Handler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/save-md":
            self.send_error(404)
            return
        try:
            n = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(n))
            name = str(data.get("filename", ""))
            # 防目录穿越: 文件名只允许 中文字母数字下划线 + .md
            if not re.fullmatch(r"[\w\u4e00-\u9fff]+\.md", name):
                self.send_error(400, "bad filename")
                return
            with open(os.path.join(ROOT, name), "w", encoding="utf-8") as f:
                f.write(str(data.get("content", "")))
            body = json.dumps({"ok": True, "file": name}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_error(500, str(e))

    def log_message(self, fmt, *args):
        pass  # 静默访问日志, 只保留错误


if __name__ == "__main__":
    port = 8765
    print(f"Crypto Dashboard → http://localhost:{port}")
    print("导出的交易记录md将直接写入本文件夹 (Ctrl+C 停止)")
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()
