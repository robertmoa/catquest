import unittest
from app import create_app
from serverstuff import db
from config import TestConfig

class UnitTests(unittest.TestCase):

    def setUp(self):
        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_login_page_loads(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)

    def test_redirect_home_not_logged_in(self):
        response = self.client.get('/home')
        # should redirect to login, not serve the page
        self.assertEqual(response.status_code, 302)
        
    def test_redirect_if_not_logged_in(self):
        response = self.client.get('/dungeon')
        # should redirect to login, not serve the page
        self.assertEqual(response.status_code, 302)
    
    def test_shop_redirect_not_logged_in(self):
        response = self.client.get('/shop')
        # should redirect to login, not serve the page
        self.assertEqual(response.status_code, 302)
    
    def test_duplicate_signup(self):
        # first signup - should work
        self.client.post('/signup', data={
            'username': 'testuser',
            'password': 'testpass'
        })
        # second signup with same username - should fail
        response = self.client.post('/signup', data={
            'username': 'testuser',
            'password': 'testpass'
        }, follow_redirects=True)
        self.assertIn(b'taken', response.data)

    def test_wrong_password(self):
        # create user
        self.client.post('/signup', data={
            'username': 'testuser',
            'password': 'testpass'
        })
        # attempt login with wrong password
        response = self.client.post('/login', data={
            'username': 'testuser',
            'password': 'wrongpass'
        }, follow_redirects=True)
        self.assertIn(b'not correct', response.data)

    def test_login_after_signup(self):
        #create user
        self.client.post('/signup', data={
            'username': 'testuser',
            'password': 'testpass'
        })
        # login with correct details
        response = self.client.post('/login', data={
            'username': 'testuser',
            'password': 'testpass'
        }, follow_redirects=True)
        self.assertIn(b'Welcome back, testuser', response.data)  
        
    def test_page_redirect_after_login_shop(self):
        #create user
        self.client.post('/signup', data={
            'username': 'testuser',
            'password': 'testpass'
        })
        # login with correct details
        response = self.client.post('/login', data={
            'username': 'testuser',
            'password': 'testpass'
        }, follow_redirects=True)
        
        response = self.client.get('/shop')
        self.assertIn(b'Gear up your cat', response.data)

    def test_page_redirect_after_login_dungeon(self):
        #create user
        self.client.post('/signup', data={
            'username': 'testuser',
            'password': 'testpass'
        })
        # login with correct details
        response = self.client.post('/login', data={
            'username': 'testuser',
            'password': 'testpass'
        }, follow_redirects=True)
        
        response = self.client.get('/dungeon')
        self.assertIn(b'Level', response.data)

    def test_page_redirect_back_to_dashboard_after_login(self):

        self.client.post('/signup', data={
            'username': 'testuser',
            'password': 'testpass'
        })
        # login with correct details
        response = self.client.post('/login', data={
            'username': 'testuser',
            'password': 'testpass'
        }, follow_redirects=True)

        response = self.client.get('/shop', 
        follow_redirects=True)
        response = self.client.get('/home', 
        follow_redirects=True)
        self.assertIn(b'Welcome back, testuser', response.data)

    def test_login_with_nonexistent_user(self):
        response = self.client.post('/login', data={
            'username': 'nonexistent',
            'password': 'nopass'
        }, follow_redirects=True)
        self.assertIn(b'not correct', response.data)

    def test_signup_with_empty_username(self):
        response = self.client.post('/signup', data={
            'username': '',
            'password': 'testpass'
        }, follow_redirects=False)

        # should stay on same page
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Username and password cannot be empty.', response.data)


    def test_signup_with_empty_password(self):
        response = self.client.post('/signup', data={
            'username': 'testuser',
            'password': ''
        }, follow_redirects=False)

        # should stay on same page
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Username and password cannot be empty.', response.data)


if __name__ == '__main__':
    unittest.main()
