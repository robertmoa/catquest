# CatQuest

A browser-based RPG dungeon crawler built with Flask and WebSockets. Fight enemies, earn gold, buy equipment from the shop, and climb to the top of the leaderboard alongside other players! all in real time.

Built for CITS3403 (Agile Web Development) at UWA.

---

## Common Issues

If something breaks during setup, jump to the fix:

- [Python not installed or wrong version](#python-not-installed)
- [pip not found](#pip-not-found)
- [venv won't create on Linux/Mac](#venv-wont-create-on-linuxmac)
- [ModuleNotFoundError after installing requirements](#modulenotfounderror)
- [Port already in use](#port-already-in-use)

---

## Tech Stack

- **Backend:** Python / Flask + Flask-SocketIO
- **Database:** SQLite via Flask-SQLAlchemy + Flask-Migrate
- **Frontend:** Vanilla JS, HTML, CSS
- **Real-time:** WebSockets (Socket.IO)

---

### 1. Clone the repo
```bash
git clone https://github.com/robertmoa/catquest
cd catquest
```

### 2. Create and activate a virtual environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

**Windows:**
```bash
pip install -r static\more\requirements.txt
```

**Mac/Linux:**
```bash
pip install -r static/more/requirements.txt
```

### 4. Set up the database (first time only)

```bash
python create_db.py
```

### 5. Run the app

```bash
python app.py
```

Then open on your default browser at: **http://127.0.0.1:5000**

---

## Full Setup (copy-paste, first time)

**Windows:**
```bash
git clone https://github.com/robertmoa/catquest
cd catquest
python -m venv venv
venv\Scripts\activate
pip install -r static\more\requirements.txt
python create_db.py
python app.py
```

**Mac/Linux:**
```bash
git clone https://github.com/robertmoa/catquest
cd catquest
python3 -m venv venv
source venv/bin/activate
pip install -r static/more/requirements.txt
python3 create_db.py
python3 app.py
```

---

## After the first setup

If you've already ran `create_db.py` before, just do:

**Windows:**
```bash
venv\Scripts\activate
python app.py
```

**Mac/Linux:**
```bash
source venv/bin/activate on Mac/Linux
python app.py
```

---

## File Structure (quick reference)

```
catquest-equip/
├── app.py              # Entry point — run this to start the server
├── create_db.py        # Run once to create and seed the database
├── models.py           # Database models (User, Monster, Item, etc.)
├── routes.py           # Page routes (login, main, dungeon, shop)
├── serverstuff.py      # Shared Flask/SocketIO/DB instances
├── sockets.py          # General socket events (chat, connections)
├── dungeon_sockets.py  # Dungeon-specific socket events (combat, gold, XP)
├── shop_sockets.py     # Shop socket events + item seeding
├── loginmgmt.py        # Login/logout socket logic
├── user_handling.py    # User stat helpers
├── templates/          # HTML templates
└── static/             # CSS, JS, images, fonts
```

---

## Troubleshooting

### Python not installed

Check if Python is installed:
```bash
python --version    # Windows
python3 --version   # Mac/Linux
```

You need Python 3.10+. Download from https://www.python.org/downloads/

> **Windows:** During install, tick **"Add Python to PATH"** or the `python` command won't work in terminal.

---

### pip not found

**Linux/Ubuntu:**
```bash
sudo apt install python3-pip
```

**Mac:**
```bash
brew install python
```

pip comes bundled with Python on Windows — if it's missing, reinstall Python.

---

### venv won't create on Linux/Mac

If you see `ensurepip is not available`:
```bash
sudo apt install python3.12-venv
```

Then retry:
```bash
python3 -m venv venv
source venv/bin/activate
```

---

### ModuleNotFoundError

If you get `No module named 'flask_socketio'` or similar after installing requirements, run:
```bash
pip install flask-socketio flask-sqlalchemy flask-migrate
```

Then retry `python create_db.py`.

---

### Port already in use

If you see `Address already in use` on port 5000:

**Mac** — port 5000 is used by AirPlay by default. Disable it in System Settings → General → AirDrop & Handoff, or change the port in `app.py`:
```python
socketio.run(app, debug=True, port=5001)
```

**Windows/Linux** — another process is on 5000. Either kill it or change the port as above.
---

## Troubleshooting

### Python not installed

Check if Python is installed:
```bash
python --version    # Windows
python3 --version   # Mac/Linux
```

You need Python 3.10+. Download from https://www.python.org/downloads/

> **Windows:** During install, tick **"Add Python to PATH"** or the `python` command won't work in terminal.

---

### pip not found

**Linux/Ubuntu:**
```bash
sudo apt install python3-pip
```

**Mac:**
```bash
brew install python
```

pip comes bundled with Python on Windows — if it's missing, reinstall Python.

---

### venv won't create on Linux/Mac

If you see `ensurepip is not available`:
```bash
sudo apt install python3.12-venv
```

Then retry:
```bash
python3 -m venv venv
source venv/bin/activate
```

---

### ModuleNotFoundError

If you get `No module named 'flask_socketio'` or similar after installing requirements, run:
```bash
pip install flask-socketio flask-sqlalchemy flask-migrate
```

Then retry `python create_db.py`.

---

### Port already in use

If you see `Address already in use` on port 5000:

**Mac** — port 5000 is used by AirPlay by default. Disable it in System Settings → General → AirDrop & Handoff, or change the port in `app.py`:
```python
socketio.run(app, debug=True, port=5001)
```

**Windows/Linux** — another process is on 5000. Either kill it or change the port as above.

---

## Group Members

| Name | Student ID |
|------|------------|
| [Robert Smart] | [24468811] |
| [Lachlan Vaz] | [24219564] |
| [Dennis Quek] | [23879473] |
