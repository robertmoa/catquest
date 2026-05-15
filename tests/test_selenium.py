# test_selenium_visual.py
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
            # Share one in-memory SQLite connection across setUp + server thread
            # so the socketio handler thread sees seeded items/users.
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

    def test_login_visually(self):
        self._login_as_test_user()
        self.assertIn("/home", self.driver.current_url)
        print("Login worked! Now on:", self.driver.current_url)

    def test_signup_visually(self):
        self.driver.get(f"{self.base_url}/")

        self.wait.until(EC.element_to_be_clickable((By.ID, "toggle-button"))).click()
        self.wait.until(EC.visibility_of_element_located((By.ID, "username"))).send_keys("newuser")
        self.driver.find_element(By.ID, "password").send_keys("newpassword")
        self.wait.until(EC.element_to_be_clickable((By.ID, "submit-button"))).click()

        self.wait.until(EC.url_contains("/home"))
        self.assertIn("/home", self.driver.current_url)
        print("Signup worked! Now on:", self.driver.current_url)

    def test_signup_with_taken_username_visually(self):
        self.driver.get(f"{self.base_url}/")

        self.wait.until(EC.element_to_be_clickable((By.ID, "toggle-button"))).click()
        self.wait.until(EC.visibility_of_element_located((By.ID, "username"))).send_keys("username")
        self.driver.find_element(By.ID, "password").send_keys("password")
        self.wait.until(EC.element_to_be_clickable((By.ID, "submit-button"))).click()

        # Wait for error message to appear on page (rendered via login.html .alert-danger div)
        error_el = self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".alert-danger")))
        self.assertIn("/signup", self.driver.current_url)
        self.assertIn("taken", error_el.text)
        print("Duplicate username error shown:", error_el.text)

    def test_wrong_password_visually(self):
        self.driver.get(f"{self.base_url}/")

        self.wait.until(EC.visibility_of_element_located((By.ID, "username"))).send_keys("username")
        self.driver.find_element(By.ID, "password").send_keys("wrongpassword")
        self.wait.until(EC.element_to_be_clickable((By.ID, "submit-button"))).click()

        error_el = self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".alert-danger")))
        self.assertIn("/login", self.driver.current_url)
        self.assertIn("not correct", error_el.text)
        print("Wrong password error shown:", error_el.text)

    def test_logout_visually(self):
        self._login_as_test_user()

        self.wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[normalize-space()='Logout']")
        )).click()

        self.wait.until(EC.url_contains("/login"))
        self.assertIn("/login", self.driver.current_url)
        self.assertEqual("Login", self.driver.find_element(By.ID, "form-title").text)
        print("Logout worked! Now on:", self.driver.current_url)

    def test_switch_between_sword_and_hat_shop(self):
        self._login_as_test_user()

        self.wait.until(EC.element_to_be_clickable((By.LINK_TEXT, "shop"))).click()
        # Wait until shop.js has finished its async init — the buy buttons
        # only appear after initializeShopCards() completes, which means
        # initializeShopTabs() (called earlier in the same function) has
        # already wired up the tab click handlers.
        self.wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#sword-shop-grid .buy-weapon-button")))
        self.wait.until(EC.element_to_be_clickable((By.ID, "hat-shop-button"))).click()

        self.wait.until(EC.text_to_be_present_in_element((By.ID, "shop-title"), "Hat Shop"))
        self.assertEqual("Hat Shop", self.driver.find_element(By.ID, "shop-title").text)
        print("Switched to hat shop! Now on:", self.driver.current_url)

    def test_navigate_home_to_dungeon(self):
        self._login_as_test_user()
        self.driver.get(f"{self.base_url}/dungeon")

        self.wait.until(EC.url_contains("/dungeon"))
        self.assertIn("/dungeon", self.driver.current_url)
        self.assertTrue(self.driver.find_element(By.ID, "battle-area").is_displayed())

    def test_home_requires_login(self):
        self.driver.get(f"{self.base_url}/home")

        # Should redirect away — wait for the login form to appear
        self.wait.until(EC.visibility_of_element_located((By.ID, "form")))
        self.assertNotIn("/home", self.driver.current_url)
        self.assertTrue(self.driver.find_element(By.ID, "form").is_displayed())

    def test_dungeon_requires_login(self):
        self.driver.get(f"{self.base_url}/dungeon")

        self.wait.until(EC.visibility_of_element_located((By.ID, "form")))
        self.assertNotIn("/dungeon", self.driver.current_url)
        self.assertTrue(self.driver.find_element(By.ID, "form").is_displayed())

    def test_shop_requires_login(self):
        self.driver.get(f"{self.base_url}/shop")

        self.wait.until(EC.visibility_of_element_located((By.ID, "form")))
        self.assertNotIn("/shop", self.driver.current_url)
        self.assertTrue(self.driver.find_element(By.ID, "form").is_displayed())

    def test_running_dungeon_attack_heal(self):
        self._login_as_test_user()
        self.driver.get(f"{self.base_url}/dungeon")

        scratch_btn = self.wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, '[data-action-id="attack"]')
        ))
        scratch_btn.click()

        heal_btn = self.wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, '[data-action-id="heal"]')
        ))
        heal_btn.click()

        self.assertIn("/dungeon", self.driver.current_url)


    def test_buy_weapon_and_hat_to_equip_both(self):
        self._login_as_rich_user()
        self.driver.get(f"{self.base_url}/shop")

        self.wait.until(EC.presence_of_all_elements_located(
            (By.CSS_SELECTOR, "#sword-shop-grid .buy-weapon-button")))
        # initializeShopButtons() runs right after initializeShopCards() finishes.
        # The buttons exist in the DOM a moment before their click handlers are
        # attached, so give the JS thread a beat to wire them up.
        time.sleep(0.5)

        sword_btn = self.driver.find_element(
            By.CSS_SELECTOR, '[data-item-name="Short Longsword"]'
        )
        sword_btn.click()
        self.wait.until(EC.alert_is_present())
        self.driver.switch_to.alert.accept()

        self.wait.until(EC.alert_is_present())
        self.driver.switch_to.alert.accept()

        self.wait.until(EC.element_to_be_clickable((By.ID, "hat-shop-button"))).click()
        self.wait.until(EC.presence_of_all_elements_located(
            (By.CSS_SELECTOR, "#hat-shop-grid .buy-weapon-button")))
        time.sleep(0.5)  # same race — handlers attach right after cards render

        hat_btn = self.driver.find_element(
            By.CSS_SELECTOR, '[data-item-name="Lensless Glasses"]'
        )
        hat_btn.click()
        self.wait.until(EC.alert_is_present())
        self.driver.switch_to.alert.accept()
        self.wait.until(EC.alert_is_present())
        self.driver.switch_to.alert.accept()

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