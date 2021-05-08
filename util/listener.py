import pyperclip as cb

while True:

    c = cb.paste()

    if len(c) > 8 and c.startswith("http"):
        print(c, flush=True, end="")