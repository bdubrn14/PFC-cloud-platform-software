import React, {Component} from 'react';
import {Cookies, withCookies} from "react-cookie";
import "../css/recipe_details.css";
import arugula from "../images/arugula.jpg";
import '../css/new_recipe.css';
import Tooltip from 'rc-tooltip';
import 'rc-time-picker/assets/index.css';
import {Button, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input} from 'reactstrap';


class RecipeDetails extends Component {
    constructor(props) {
        super(props);
        this.recipe_uuid = this.props.location.pathname.replace("/recipe_details/", "").replace("#", "")
        this.state = {
            recipe_name: "",
            recipe_image: '',
            recipe_description: "",
            recipe_plant: "",
            recipe_uuid: this.recipe_uuid,
            recipe_json: {},
            peripherals: [],
            history: {},
            devices: [],
            led_panel_dac5578: {
                'on_cool_white': '',
                'on_warm_white': '',
                'on_blue': '',
                'on_green': '',
                'on_red': '',
                'on_far_red': '',
                'off_cool_white': '',
                'off_warm_white': '',
                'off_blue': '',
                'off_green': '',
                'off_red': '',
                'off_far_red': ''
            },
            apply_to_device_modal: false
        };
        this.getRecipeDetails = this.getRecipeDetails.bind(this);
        this.toggle_apply_to_device = this.toggle_apply_to_device.bind(this);
        this.handleChange = this.handleChange.bind(this);

    }

    handleChange(event) {
        this.setState({
            [event.target.name]: event.target.value
        }, () => {
            // console.log("State", this.state);
        });
        event.preventDefault();

    }

    componentDidMount() {
        this.getRecipeDetails()
    }

    toggle_apply_to_device(recipe_uuid) {
        this.setState({
            apply_to_device_modal: !this.state.apply_to_device_modal,
            selected_recipe_uuid: recipe_uuid
        })
    }

    getRecipeDetails() {
        return fetch(process.env.REACT_APP_FLASK_URL + "/api/get_recipe_by_uuid/", {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                'recipe_uuid': this.state.recipe_uuid,
                'user_token': this.props.cookies.get('user_token')
            })
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson)
                if (responseJson["response_code"] == 200) {
                    let resultJson = responseJson["results"][0]
                    this.setState({recipe_name: resultJson["name"]})
                    this.setState({recipe_image: resultJson["image_url"]})
                    this.setState({recipe_description: resultJson["description"]})
                    this.setState({recipe_plant: resultJson["plant_type"]})
                    this.setState({modified_at: resultJson["modified_at"]})
                    this.setState({recipe_json: resultJson["recipe_json"]})
                    this.setState({peripherals: (resultJson["peripherals"])})
                    this.setState({devices: responseJson["devices"]})
                    let standard_day = resultJson["recipe_json"]['environments']['standard_day']['light_spectrum_nm_percent']
                    let standard_night = resultJson["recipe_json"]['environments']['standard_day']['light_spectrum_nm_percent']

                    let led_data = {
                        'on_cool_white': standard_day['400-449'],
                        'on_warm_white': standard_day['449-499'],
                        'on_blue': standard_day['500-549'],
                        'on_green': standard_day['550-599'],
                        'on_red': standard_day['600-649'],
                        'on_far_red': standard_day['650-699'],
                        'off_cool_white': standard_night['400-449'],
                        'off_warm_white': standard_night['449-499'],
                        'off_blue': standard_night['500-549'],
                        'off_green': standard_night['550-599'],
                        'off_red': standard_night['600-649'],
                        'off_far_red': standard_night['650-699']
                    }
                    this.setState({
                        led_panel_dac5578: led_data
                    })
                    var devs = [];                  // make array
                    devs = responseJson["devices"]; // assign array
                    if (devs.length > 0) {         // if we have devices
                        // default the selected device to the first/only dev.
                        this.state.selected_device_uuid = devs[0].device_uuid;
                    }

                    // this.setState({history: responseJson["history"]})
                }
            })
            .catch((error) => {
                console.error(error);
            });
    }


    render() {
        let flatten = function (arr) {
            return arr.reduce(function (flat, toFlatten) {
                return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
            }, []);
        };
        let listperipherals = this.state.peripherals.map((component) => {
            return (<div className="row" key={component.type}>
                <div className="col-md-6">
                    {component.name}
                </div>

            </div>)

        });

        let recipeParams = this.state.peripherals.map(function (peripheral_json) {

            if (peripheral_json) {
                let peripheral_html = []
                peripheral_html.push(<div className="row label-row">
                    <div className="col-md-6 rounded-col" style={{backgroundColor: peripheral_json.color}}>
                        {peripheral_json.name}
                    </div>
                </div>)
                // Get all the input fields needed to load required fields for this peripheral
                let fields = JSON.parse(peripheral_json.inputs)
                for (let field of fields) {
                    if (field.field_type === "text_input") {
                        peripheral_html.push(
                            <div className="row field-row">
                                <span>Sensor values are published every time environment changes </span>
                            </div>)

                    }
                    if (field.field_type === "led_panel") {

                        peripheral_html.push(<div className="row">
                                <div className="col-md-6">
                                    <div className="card led-stats-card">
                                        <div className="card-block">
                                            <h4 className="card-title "> Choose LED Spectrum for Standard Day </h4>
                                            <div className="card-text">
                                                <div className="graph">
                                                    <div className="">
                                                        <div className="row colors-row">
                                                            <div className="col-md-6">
                                                                <span>Cool White</span>
                                                            </div>
                                                            <div className="col-md-6">

                                                                <Input value={this.state['led_panel_dac5578']['on_cool_white']}

                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="row colors-row">
                                                            <div className="col-md-6">
                                                                <span>Warm White</span>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <Input value={this.state['led_panel_dac5578']['on_warm_white']}

                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="row colors-row">
                                                            <div className="col-md-6">
                                                                <span>Blue</span>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <Input
                                                                    value={this.state['led_panel_dac5578']['on_blue']}

                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="row colors-row">
                                                            <div className="col-md-6">
                                                                <span>Green</span>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <Input
                                                                    value={this.state['led_panel_dac5578']['on_green']}

                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="row colors-row">
                                                            <div className="col-md-6">
                                                                <span>Red</span>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <Input
                                                                   value={this.state['led_panel_dac5578']['on_red']}

                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="row colors-row">
                                                            <div className="col-md-6">
                                                                <span>Far Red</span>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <Input
                                                                   value={this.state['led_panel_dac5578']['on_far_red']}

                                                                />
                                                            </div>
                                                        </div>
                                                    </div>


                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="card led-stats-card">
                                        <div className="card-block">
                                            <h4 className="card-title "> Choose LED Spectrum for Standard Night </h4>
                                            <div className="card-text">
                                                <div className="graph">
                                                    <div className="">
                                                        <div className="row colors-row">
                                                            <div className="col-md-6">
                                                                <span>Cool White</span>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <Input
                                                                   value={this.state['led_panel_dac5578']['off_cool_white']}

                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="row colors-row">
                                                            <div className="col-md-6">
                                                                <span>Warm White</span>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <Input
                                                                   value={this.state['led_panel_dac5578']['off_warm_white']}

                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="row colors-row">
                                                            <div className="col-md-6">
                                                                <span>Blue</span>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <Input
                                                                  value={this.state['led_panel_dac5578']['off_blue']}

                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="row colors-row">
                                                            <div className="col-md-6">
                                                                <span>Green</span>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <Input
                                                                   value={this.state['led_panel_dac5578']['off_green']}

                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="row colors-row">
                                                            <div className="col-md-6">
                                                                <span>Red</span>
                                                            </div>
                                                            <div className="col-md-6">
                                                          <Input  value={this.state['led_panel_dac5578']['off_red']}

                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="row colors-row">
                                                            <div className="col-md-6">
                                                                <span>Far Red</span>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <Input
                                                                  value={this.state['led_panel_dac5578']['off_far_red']}

                                                                />
                                                            </div>
                                                        </div>
                                                    </div>


                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                }
                return peripheral_html
            }
        }, this);
        return (
            <div className="home-container">
                <div className="row">
                    <div className="col-md-4">
                        <a href="/recipes"> Back to climate recipes</a>
                    </div>
                </div>
                <div className="row home-row">
                    <div className="col-md-3 img-col">
                        <img src={this.state.recipe_image}/>
                    </div>

                    <div className="col-md-9">

                        <div className="row card-row">
                            <h3>{this.state.recipe_name} for {this.state.recipe_plant} </h3>
                        </div>

                        <div className="row card-row">

                            <div className="col-md-12">
                                <div className="card">
                                    <div className="card-body">
                                        <div className="card-text">
                                            {this.state.recipe_description}
                                        </div>
                                    </div>
                                </div>
                            </div>


                        </div>
                        <div className="row card-row">

                            <h3>Peripherals used in this climate recipe </h3>

                        </div>
                        <div className="row card-row">
                            <div className="col-md-12">
                                <div className="card">
                                    <div className="card-body">
                                        {/*<div className="card-title"></div>*/}
                                        <div className="card-text">
                                            {listperipherals}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="row card-row">

                            <h3>Parameters of the Climate Recipe </h3>

                        </div>
                        <div className="row card-row">
                            <div className="col-md-12">


                                {recipeParams}


                            </div>
                        </div>
                        <div className="row card-row">
                            <Button onClick={this.toggle_apply_to_device.bind(this, this.recipe_uuid)}
                                    id={this.recipe_uuid}>Apply Recipe
                            </Button>
                        </div>

                    </div>


                </div>
                <Modal isOpen={this.state.apply_to_device_modal} toggle={this.toggle_apply_to_device}
                       className={this.props.className}>
                    <ModalHeader toggle={this.toggle_apply_to_device}>Select a device to apply this recipe
                        to </ModalHeader>
                    <ModalBody>
                        <select className="form-control smallInput" onChange={this.handleChange}
                                id="selected_device_uuid" name="selected_device_uuid"
                                value={this.selected_device_uuid}>
                            {this.state.devices.map(function (device) {
                                return <option key={device.device_uuid}
                                               value={device.device_uuid}>{device.device_name}</option>
                            })}
                        </select>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="primary" onClick={this.apply_to_device}>Apply to this device</Button>
                        <Button color="secondary" onClick={this.toggle_apply_to_device}>Close</Button>
                    </ModalFooter>
                </Modal>

            </div>

        )
    }
}

export default withCookies(RecipeDetails);
