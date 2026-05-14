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

    def test_signup_visually(self):
        self.driver.get(f"{self.base_url}/")
        time.sleep(1)

        self.driver.find_element(By.ID, "toggle-button").click()
        time.sleep(0.5)

        self.driver.find_element(By.ID, "username").send_keys("newuser")
        time.sleep(0.5)

        self.driver.find_element(By.ID, "password").send_keys("newpassword")
        time.sleep(0.5)

        self.driver.find_element(By.ID, "submit-button").click()
        time.sleep(1)

        self.assertIn("/home", self.driver.current_url)
        print("Signup worked! Now on:", self.driver.current_url)


    def test_signup_with_taken_username_visually(self):
        self.driver.get(f"{self.base_url}/")
        time.sleep(1)

        self.driver.find_element(By.ID, "toggle-button").click()
        time.sleep(0.5)

        self.driver.find_element(By.ID, "username").send_keys("username")
        time.sleep(0.5)

        self.driver.find_element(By.ID, "password").send_keys("password")
        time.sleep(0.5)

        self.driver.find_element(By.ID, "submit-button").click()
        time.sleep(1)

        # Should still be on the signup page with an error message
        self.assertIn("/signup", self.driver.current_url)
        error_text = self.driver.find_element(By.ID, "error-message").text
        self.assertIn("taken", error_text)
        print("Duplicate username error shown:", error_text)

    def test_wrong_password_visually(self):
        self.driver.get(f"{self.base_url}/")
        time.sleep(1)

        self.driver.find_element(By.ID, "username").send_keys("username")
        time.sleep(0.5)
        self.driver.find_element(By.ID, "password").send_keys("wrongpassword")
        time.sleep(0.5)
        self.driver.find_element(By.ID, "submit-button").click()
        time.sleep(1) 

        # Should still be on the login page with an error message
        self.assertIn("/login", self.driver.current_url)
        error_text = self.driver.find_element(By.ID, "error-message").text
        self.assertIn("not correct", error_text)
        print("Wrong password error shown:", error_text) 

    def test_logout_visually(self):
        # First log in
        self.driver.get(f"{self.base_url}/")
        time.sleep(1)

        self.driver.find_element(By.ID, "username").send_keys("username")
        time.sleep(0.5)
        self.driver.find_element(By.ID, "password").send_keys("password")
        time.sleep(0.5)
        self.driver.find_element(By.ID, "submit-button").click()
        time.sleep(1) 

        # Now log out
        self.driver.find_element(By.XPATH, "//button[normalize-space()='Logout']").click()
        time.sleep(1)

        # Should be back on the login page
        self.assertIn("/login", self.driver.current_url)
        self.assertEqual("Login", self.driver.find_element(By.ID, "form-title").text)
        print("Logout worked! Now on:", self.driver.current_url)


    def test_switch_between_sword_and_hat_shop(self):
        self.driver.get(f"{self.base_url}/")
        time.sleep(1)

        self.driver.find_element(By.ID, "toggle-button").click()
        time.sleep(0.5)

        self.driver.find_element(By.ID, "username").send_keys("BallBlasterShotgunNado")
        time.sleep(0.5)

        self.driver.find_element(By.ID, "password").send_keys("password1")
        time.sleep(0.5)

        self.driver.find_element(By.ID, "submit-button").click()
        time.sleep(1)

        
        self.driver.find_element(By.LINK_TEXT, "shop").click()
        time.sleep(1)   

        self.driver.find_element(By.ID, "hat-shop-button").click()
        time.sleep(1)

        self.assertEqual("Hat Shop", self.driver.find_element(By.ID, "shop-title").text)
        print("Switched to hat shop! Now on:", self.driver.current_url) 











if __name__ == "__main__":
    unittest.main()
