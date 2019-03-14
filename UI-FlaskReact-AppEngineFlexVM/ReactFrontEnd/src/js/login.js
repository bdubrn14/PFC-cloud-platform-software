import React, {Component} from 'react';
import logo from '../images/logo.svg';
import '../scss/login.scss';
import {Link} from "react-router-dom";
import {Cookies, withCookies} from "react-cookie";

class login extends Component {
    constructor(props) {
        super(props);
        // Save the vcode
        this.vcode  = ""
        var qs = require('url').parse(window.location.href, true).query;
        console.log(qs)
        if( typeof qs['vcode'] != 'undefined') {
            console.log(qs['vcode'])
            this.vcode = qs['vcode'];
        }
        this.state = {
            username: '',
            password: '',
            error_message: '',
            render: false,
            vcode:this.vcode
        };
        // This binding is necessary to make `this` work in the callback
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.verifyUser = this.verifyUser.bind(this)
        this.signUpClick = this.signUpClick.bind(this);

    }

    componentDidMount() {
        console.log("Did mount called");
        this.verifyUser()
    }
    signUpClick()
    {
         if(this.state.vcode != "" && this.state.vcode != undefined && this.state.vcode != "undefined") {
                        window.location.href = "/signup?vcode=" + this.state.vcode
                    }
                    else {
             window.location.href = "/signup"
        }
    }
    verifyUser()
    {

        const token = this.props.cookies.get("user_token");
        return fetch(process.env.REACT_APP_FLASK_URL + '/api/verify_user_session/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                'user_token': token
            })
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson);
                if (responseJson["response_code"] != 200) {
                    this.setState({render: true});
                    console.log("Bad response");
                }

                console.log(responseJson);
                if (responseJson["is_expired"]) {
                    this.setState({render: true});
                    this.props.cookies.remove("user_token");
                } else {
                    const user_uuid = responseJson["user_uuid"];
                    window.location.href = "/home?uu="+(user_uuid).toString()+"?vcode="+this.state.vcode
                }
            })
            .catch((error) => {
                console.error(error);
            });
    }

    handleChange(event) {
        this.setState({[event.target.name]: event.target.value});
        event.preventDefault();
    }

    handleSubmit(event) {

        console.log('A login form was submitted: ' + this.state);
        this.loginUser()
        event.preventDefault();
    }

    loginUser() {

        return fetch( process.env.REACT_APP_FLASK_URL + '/login/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials':true
            },
            body: JSON.stringify({
                'username': this.state.username,
                'password': this.state.password
            })
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson)
                if (responseJson["response_code"]== 200){
                    let user_uuid = responseJson["user_uuid"]
                    this.props.cookies.set('user_token',responseJson['user_token'])
                    this.props.cookies.set('is_admin',responseJson['is_admin'])
//debugrob:
                    this.props.cookies.set('username', this.state.username)
                    var new_href = "/home?uu="+(user_uuid).toString()
                    if( typeof this.state.vcode != 'undefined') {
                        new_href += "?vcode=" + this.state.vcode;
                    }
                    window.location.href = new_href;
                } else {
                    let error_message = responseJson["message"]
                    this.setState({error_message: error_message})
                }

            })
            .catch((error) => {
                console.error(error);
            });

    }

    render() {

            return (
                <div className="login-page">
                    <div className="form">
                        {this.state.error_message &&
                            <p style={{color: 'red'}}>
                                {this.state.error_message}
                            </p>
                        }
                        <div className="image-section">
                            <img className="logo" src={logo}></img>
                        </div>
                        <form onSubmit={this.handleSubmit}>
                            <input type="text" placeholder="username" name="username" value={this.state.username}
                                   onChange={this.handleChange}/>
                            <input type="password" placeholder="password" name="password" value={this.state.password}
                                   onChange={this.handleChange}/>
                            <button>login</button>

                            <p className="message">Not registered? <a onClick={this.signUpClick}> Create an account </a> </p>
                        </form>
                    </div>
                </div>
            )

    }
}

export default withCookies(login);
