# test_selenium_visual.py
import socket
import unittest
import threading
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from werkzeug.security import generate_password_hash


def _free_port():
    """Return an OS-assigned free port so parallel tests never collide on 5001."""
    with socket.socket() as s:
        s.bind(("", 0))
        return s.getsockname()[1]

from app import create_app
from serverstuff import db
from models import User, UserStat

class VisualLoginTest(unittest.TestCase):

    def setUp(self):
        # Pass test config in — overrides DB URI BEFORE db.init_app runs
        self.app = create_app({
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'TESTING': True,
            'WTF_CSRF_ENABLED': False
        })

        self.app_context = self.app.app_context()
        self.app_context.push()

        db.create_all()

        # Add test user
        test_user = User(
            username="username",
            password=generate_password_hash("password")
        )
        db.session.add(test_user)
        db.session.flush()  # get the user.id before commit

        # User needs a UserStat row (1-to-1 relationship in your models)
        stat = UserStat(user_id=test_user.id)
        db.session.add(stat)
        db.session.commit()

        # Every test uses new port so no conflict in ports.
        self.port = _free_port()
        self.base_url = f"http://localhost:{self.port}"
        self.server_thread = threading.Thread(
            target=lambda: self.app.run(port=self.port, use_reloader=False)
        )
        self.server_thread.daemon = True
        self.server_thread.start()
        time.sleep(1)

        # Start Chrome, headless, so visible window
        options = webdriver.ChromeOptions()
        self.driver = webdriver.Chrome(options=options)
        self.driver.implicitly_wait(3)

    def test_login_visually(self):
        # Valid credentials should redirect to /home — core happy path.
        self.driver.get(f"{self.base_url}/")
        time.sleep(1)

        self.driver.find_element(By.ID, "username").send_keys("username")
        time.sleep(0.5)

        self.driver.find_element(By.ID, "password").send_keys("password")
        time.sleep(0.5)

        self.driver.find_element(By.ID, "submit-button").click()
        time.sleep(1)

        self.assertIn("/home", self.driver.current_url)
        print("Login worked! Now on:", self.driver.current_url)

if __name__ == "__main__":
    unittest.main()
