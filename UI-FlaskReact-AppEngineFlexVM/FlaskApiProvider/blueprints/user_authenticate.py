from FCClass.user import User
from FCClass.user_session import UserSession
from flask import Response
from flask import request
from flask import Blueprint
from pyisemail import is_email

from .utils.env_variables import *
from .utils.response import success_response, error_response

user_authenticate = Blueprint('user_authenticate', __name__)

@user_authenticate.route('/api/signup/', methods=['GET', 'POST'])
def signup():
    received_form_response = json.loads(request.data.decode('utf-8'))
    username = received_form_response.get("username")
    email_address = received_form_response.get("email_address")
    password = received_form_response.get("password")
    organization = received_form_response.get("organization")

    if not (username and email_address and password):
        return error_response(
            message="Please make sure you have added values for all the fields"
        )

    if not is_email(email_address, check_dns=True):
        return error_response(
            message="Invalid email."
        )

    user_uuid = User(username=username, password=password, email_address=email_address,
                     organization=organization).insert_into_db(datastore_client)

    if user_uuid:
        return success_response()

    else:
        return error_response(
            message="User creation failed."
        )

@user_authenticate.route('/login/', methods=['GET', 'POST'])
def login():
    received_form_response = json.loads(request.data.decode('utf-8'))

    username = received_form_response.get("username")
    password = received_form_response.get("password")

    if not (username and password):
        return error_response(
            message="Please make sure you have added values for all the fields"
        )

    user = User(username=username, password=password)
    user_uuid, is_admin = user.login_user(client=datastore_client)
    if user_uuid is None:
        return error_response(
            message="Login failed. Please check your credentials."
        )

    session_token = UserSession(user_uuid=user_uuid).insert_into_db(client=datastore_client)
    return success_response(
        user_uuid=user_uuid,
        user_token=session_token,
        is_admin=is_admin,
        message="Login Successful"
    )
