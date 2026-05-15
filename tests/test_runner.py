import socket
import unittest
import threading
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from werkzeug.security import generate_password_hash
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def _free_port():
    """Return an OS-assigned free port so parallel tests never collide on 5001."""
    with socket.socket() as s:
        s.bind(("", 0))
        return s.getsockname()[1]

from sqlalchemy.pool import StaticPool
from app import create_app
from serverstuff import db
from models import User, UserStat

class VisualLoginTest(unittest.TestCase):

    def setUp(self):
        self.app = create_app({
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            # Share one in-memory SQLite connection across all threads/sessions.
            # Without StaticPool every new connection gets its OWN empty :memory:
            # DB, so the socketio worker thread can't see seeded data.
            'SQLALCHEMY_ENGINE_OPTIONS': {
                'connect_args': {'check_same_thread': False},
                'poolclass': StaticPool,
            },
            'TESTING': True,
            'WTF_CSRF_ENABLED': False
        })

        self.app_context = self.app.app_context()
        self.app_context.push()

        db.create_all()

        from shop_sockets import seed_swords, seed_armour
        seed_swords()
        seed_armour()

        test_user = User(
            username="username",
            password=generate_password_hash("password")
        )
        db.session.add(test_user)
        db.session.flush()
        db.session.add(UserStat(user_id=test_user.id))

        rich_user = User(
            username="richuser",
            password=generate_password_hash("password")
        )
        db.session.add(rich_user)
        db.session.flush()
        db.session.add(UserStat(user_id=rich_user.id, gold=99999))

        db.session.commit()

        self.port = _free_port()
        self.base_url = f"http://localhost:{self.port}"

        from serverstuff import socketio
        self.server_thread = threading.Thread(
            target=lambda: socketio.run(self.app, port=self.port, use_reloader=False)
        )
        self.server_thread.daemon = True
        self.server_thread.start()
        time.sleep(1)

        options = webdriver.ChromeOptions()
        self.driver = webdriver.Chrome(options=options)
        self.driver.implicitly_wait(3)

        self.wait = WebDriverWait(self.driver, 10)

    def test_buy_weapon_and_hat_then_equip_both(self):
        self._login_as_rich_user()
        self.driver.get(f"{self.base_url}/shop")

        # Wait for shop cards to load (async initializeShopCards populates the grid)
        self.wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#sword-shop-grid .buy-weapon-button")
        ))

        # Buy Short Longsword
        sword_btn = self.driver.find_element(
            By.CSS_SELECTOR, '[data-item-name="Short Longsword"]'
        )
        sword_btn.click()
        self.wait.until(EC.alert_is_present())
        self.driver.switch_to.alert.accept()
        # Second alert — "Purchased X for Y gold"
        self.wait.until(EC.alert_is_present())
        self.driver.switch_to.alert.accept()

        # Switch to hat shop
        self.wait.until(EC.element_to_be_clickable((By.ID, "hat-shop-button"))).click()
        self.wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#hat-shop-grid .buy-weapon-button")
        ))

        # Buy Lensless Glasses
        hat_btn = self.driver.find_element(
            By.CSS_SELECTOR, '[data-item-name="Lensless Glasses"]'
        )
        hat_btn.click()
        self.wait.until(EC.alert_is_present())
        self.driver.switch_to.alert.accept()
        self.wait.until(EC.alert_is_present())
        self.driver.switch_to.alert.accept()

        # Go to home and equip both
        self.driver.get(f"{self.base_url}/home")
        self.wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, '#inventory-grid .equip-weapon-button[data-item-type="sword"]')
        ))

        self.wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, '#inventory-grid .equip-weapon-button[data-item-type="sword"]')
        )).click()

        self.wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, '#inventory-grid .equip-weapon-button[data-item-type="armour"]')
        )).click()

        # Assert both show as equipped
        sword_equip = self.driver.find_element(
            By.CSS_SELECTOR, '#inventory-grid .equip-weapon-button[data-item-type="sword"]'
        )
        hat_equip = self.driver.find_element(
            By.CSS_SELECTOR, '#inventory-grid .equip-weapon-button[data-item-type="armour"]'
        )
        self.assertEqual(sword_equip.text, "Equipped")
        self.assertEqual(hat_equip.text, "Equipped")


    def _login_as_test_user(self):
        """Call upon this if you need to login, don't remake login every call."""
        self.driver.get(f"{self.base_url}/")
        self.wait.until(EC.visibility_of_element_located((By.ID, "username"))).send_keys("username")
        self.driver.find_element(By.ID, "password").send_keys("password")
        self.wait.until(EC.element_to_be_clickable((By.ID, "submit-button"))).click()
        self.wait.until(EC.url_contains("/home"))

    def _login_as_rich_user(self):
        """Login as seeded user with 99999 gold for shop behaviour tests."""
        self.driver.get(f"{self.base_url}/")
        self.wait.until(EC.visibility_of_element_located((By.ID, "username"))).send_keys("richuser")
        self.driver.find_element(By.ID, "password").send_keys("password")
        self.wait.until(EC.element_to_be_clickable((By.ID, "submit-button"))).click()
        self.wait.until(EC.url_contains("/home"))

    def tearDown(self):
        self.driver.quit()
        db.session.remove()
        db.drop_all()
        self.app_context.pop()


if __name__ == "__main__":
    unittest.main()
