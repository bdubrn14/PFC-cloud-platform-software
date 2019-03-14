import React, {Component} from 'react';
import '../scss/device_homepage.scss';
import {Cookies, withCookies} from "react-cookie";
import {$, jQuery} from 'jquery';
// import Draggable from 'react-draggable';
import Plot from 'react-plotly.js';
import 'rc-time-picker/assets/index.css';
import Console from 'react-console-component';
import 'react-console-component/main.css';
import FileSaver from 'file-saver';

import {DevicesDropdown} from './components/devices_dropdown';
import {AddAccessCodeModal} from './components/add_access_code_modal';
import {AddDeviceModal} from './components/add_device_modal';
import {DeviceIsRunningModal} from './components/device_is_running_modal';
import {
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    Button,
    DropdownItem
} from 'reactstrap';

import 'rc-slider/assets/index.css';
import 'rc-tooltip/assets/bootstrap.css';
import Tooltip from 'rc-tooltip';
import Slider from 'rc-slider';
import {LEDSpectrumOptions} from "./components/led_spectrum_options";

import * as api from './utils/api';

const createSliderWithTooltip = Slider.createSliderWithTooltip;
const Range = createSliderWithTooltip(Slider.Range);
const Handle = Slider.Handle;

const handle = (props) => {
    const {value, dragging, index, ...restProps} = props;
    return (
        <Tooltip
            prefixCls="rc-slider-tooltip"
            overlay={value}
            visible={dragging}
            placement="top"
            key={index}
        >
            <Handle value={value} {...restProps} />
        </Tooltip>
    );
};

const displayNamesLookup = {
    "cool_white": "Cool White",
    "warm_white": "Warm White",
    "blue": "Blue",
    "far_red": "Far Red",
    "green": "Green",
    "red": "Red",
    "sensor_rh": "Relative Humidity Publish Frequency",
    "sensor_temp": "Temperature Publish Frequency",
    "sensor_co2": "CO2 Sensor Publish Frequency",
    "led_on_from": "LED ON From",
    "led_on_to": "LED ON to",
    "led_off_from": "LED OFF From",
    "led_off_to": "LED OFF To",
    "led_panel_dac5578": "LED ON"

}

class DeviceHomepage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            count: 0,
            sensor_temp_border: "",
            sensor_co2_border: "",
            sensor_rh_border: "",
            led_on_border: "",
            led_off_border: "",
            standard_day: '',
            config: {'displaylogo': false},
            current_rh: "Loading",
            current_temp: "Loading",
            current_co2: "Loading",
            top_temp: "Loading",
            middle_temp: "Loading",
            bottom_temp: "Loading",
            sensor_co2: 60,
            sensor_temp: 60,
            sensor_rh: 60,
            rh_data: [],
            co2_data: [],
            plant_height_results_data: [],
            action_isOpen: false,
            led_panel_dac5578: {
                'on_illumination_distance': 5,
                'off_illumination_distance': 5,
                'off_selected_spectrum': "flat",
                "on_selected_spectrum": "flat"
            },
            temp_data_x: [],
            temp_data_y: [],
            co2_data_x: [],
            co2_data_y: [],
            rh_data_x: [],
            rh_data_y: [],
            led_data: [],
            temp_data: [],
            top_temp_data_x: [],
            top_temp_data_y: [],
            top_temp_data: [],
            middle_temp_data_x: [],
            middle_temp_data_y: [],
            middle_temp_data: [],
            bottom_temp_data_x: [],
            bottom_temp_data_y: [],
            bottom_temp_data: [],
            leaf_count_results_data: [],
            temp_layout: {title: '', width: 1, height: 1},
            led_layout: {title: '', width: 1, height: 1},
            rh_layout: {title: '', width: 1, height: 1},
            co2_layout: {title: '', width: 1, height: 1},
            plant_height_results_layout: {title: '', width: 1, height: 1},
            leaf_count_results_layout: {title: '', width: 1, height: 1},
            show_temp_line: false,
            show_rh_line: false,
            user_devices: new Map(),
            selected_device: 'Loading',
            recipe_name: '',
            recipe_link: '',
            modal: false,
            add_device_modal: false,
            add_access_modal: false,
            access_code_error_message: '',
            add_device_error_message: '',
            apply_confirmation_modal: false,
            changes: {},
            control_level: 'view',
            current_recipe: {},
            edit_mode: false,
            selectedAction: 'Select an action',
            BCC: false,
        };
        this.child = {
            console: Console
        };
        this.toggle_action_drop = this.toggle_action_drop.bind(this);
        this.changes = {led_panel_dac5578: {}, led_panel_dac5578: {}}
        this.getUserDevices = this.getUserDevices.bind(this);
        this.getCurrentStats = this.getCurrentStats.bind(this);
        this.getTempDetails = this.getTempDetails.bind(this);
        this.getCO2Details = this.getCO2Details.bind(this);
        this.toggleRHData = this.toggleRHData.bind(this);
        this.toggleTempData = this.toggleTempData.bind(this);
        this.handleColorChange = this.handleColorChange.bind(this);
        this.modalToggle = this.modalToggle.bind(this);
        this.sensorOnChange = this.sensorOnChange.bind(this);
        this.echo = this.echo.bind(this);
        this.LEDPanelChange = this.LEDPanelChange.bind(this);
        this.handleApplySubmit = this.handleApplySubmit.bind(this);
        this.timeonChange = this.timeonChange.bind(this);
        this.downloadCSV = this.downloadCSV.bind(this);
        this.getRecipeOnDevice = this.getRecipeOnDevice.bind(this);
        this.setLEDStates = this.setLEDStates.bind(this);
        this.LEDSpectrumSelection = this.LEDSpectrumSelection.bind(this);
        this.toggleEditMode = this.toggleEditMode.bind(this);
        this.accessChamber = this.accessChamber.bind(this);
        this.goToHarvest = this.goToHarvest.bind(this)
        this.submitRecipe = this.submitRecipe.bind(this)
    }

    toggleEditMode() {
        console.log("Change to edit mode")
        this.setState({edit_mode: !this.state.edit_mode})
    }

    setLEDStates() {

        let standard_day = this.state.current_recipe['environments']['standard_day']
        let standard_night = this.state.current_recipe['environments']['standard_night']
        console.log(standard_day)
        let led_data = {
            'on_illumination_distance': standard_day['light_illumination_distance_cm'],
            "off_selected_spectrum": standard_night["spectrum_key"],
            "on_selected_spectrum": standard_day["spectrum_key"],
            'off_illumination_distance': standard_day['light_illumination_distance_cm']
        };
        this.setState({
            led_panel_dac5578: led_data
        })

        let standard_day_duration = this.state.current_recipe["phases"][0]['cycles'][0]['duration_hours']
        let standard_night_duration = this.state.current_recipe["phases"][0]['cycles'][1]['duration_hours']
        this.setState({standard_day: standard_day_duration})
        this.setState({standard_night: standard_night_duration})

        let spectrum_x = []
        let value_y = []
        Object.keys(led_data).forEach(function (k) {
            spectrum_x.push(k);
            value_y.push(led_data[k]);
        });
        this.setState({
            'led_chart_data': [{
                type: 'bar',
                name: '',
                x: spectrum_x,
                y: value_y,
                line: {color: '#ECAD48'}
            }]
        });

        this.setState({
            'led_layout': {
                width: 350,
                height: 450,
                xaxis: {
                    autorange: true,
                    type: 'category'
                },
                yaxis: {
                    autorange: true,
                    type: 'linear'
                }
            }
        });
    }

    timeonChange(data_type, value) {

        this.changes[data_type] = value._d;
        this.setState({[data_type]: value._d})
        this.setState({changes: this.changes})
    }

    toggleDeviceModal = () => {
        this.setState(prevState => {
            return {
                add_device_modal: !prevState.add_device_modal,
                add_device_error_message: ''
            }
        });
    }

    toggleAccessCodeModal = () => {
        this.setState(prevState => {
            return {
                add_access_modal: !prevState.add_access_modal,
                access_code_error_message: ''
            }
        });
    }

    toggleApplyConfirmation = () => {
        this.setState(prevState => {
            return {
                apply_confirmation_modal: !prevState.apply_confirmation_modal
            }
        });
    }
    submitMeasurements = () => {
        return fetch(process.env.REACT_APP_FLASK_URL + '/api/submit_horticulture_measurements/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                'user_uuid': this.state.user_uuid,
                'user_token': this.props.cookies.get('user_token'),
                'device_uuid': this.state.selected_device_uuid,
                'measurement': ({
                    "plant_height": this.state.plant_height,
                    "leaves_count": this.state.leaves_count
                })
            })
        }).then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson)
                if (responseJson["response_code"] == 200) {
                    this.setState({plant_height: ""})
                    this.setState({leaves_count: ""})
                } else {
                    console.log("Something went wrong")
                }
            })
            .catch((error) => {
                console.error(error);
            });

    }
    checkApply = () => {
        api.getCurrentRecipeInfo(
            this.props.cookies.get('user_token'),
            this.state.selected_device_uuid
        ).then(response => {
            // If is running recipe
            if (!response.expired) {
                this.toggleApplyConfirmation();
            } else {
                this.handleApplySubmit();
                this.toggleEditMode()
            }
        });
    }

    onSubmitDevice = (modal_state) => {
        console.log(JSON.stringify({
            'user_token': this.props.cookies.get('user_token'),
            'device_name': modal_state.device_name,
            'device_reg_no': modal_state.device_reg_no,
            'device_notes': modal_state.device_notes,
            'device_type': modal_state.device_type
        }))
        return fetch(process.env.REACT_APP_FLASK_URL + '/api/register/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                'user_uuid': this.state.user_uuid,
                'user_token': this.props.cookies.get('user_token'),
                'device_name': modal_state.device_name,
                'device_reg_no': modal_state.device_reg_no,
                'device_notes': modal_state.device_notes,
                'device_type': modal_state.device_type
            })
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson)
                if (responseJson["response_code"] == 200) {
                    this.toggleDeviceModal();
                    this.getUserDevices()
                } else {
                    this.setState({
                        add_device_error_message: responseJson["message"]
                    });
                }
            })
            .catch((error) => {
                console.error(error);
            });
    }

    LEDSpectrumSelection(led_data_type, color_channel, spectrum_type, value) {

        if (led_data_type === "led_panel_dac5578") {
            let color_json = this.state['led_panel_dac5578'];
            color_json[color_channel] = spectrum_type;
            this.setState({led_panel_dac5578: color_json})
            console.log(this.state.led_panel_dac5578)
        }
    }

    modalToggle() {
        this.setState({
            modal: !this.state.modal
        });
    }

    componentDidMount() {
        this.getUserDevices();
        // Show a special page for the BCC user
        if (this.props.cookies.get('username') === 'BCC') {
            this.setState({BCC: true})
        }
    }

    LEDPanelChange(led_data_type, color_channel, value) {
        console.log(color_channel, value)
        if (led_data_type === "led_panel_dac5578") {
            let color_json = this.state['led_panel_dac5578'];
            color_json[color_channel] = value;
            this.setState({led_panel_dac5578: color_json});
            this.changes['led_panel_dac5578'][color_channel] = value;
            // this.setState({["led_on_border"]: "3px solid #883c63"});
            this.setState({changes: this.changes});
        }

    }

    sensorOnChange(e) {

        if (e.target.name.indexOf("sensor") >= 0) {
            this.setState({[e.target.name + "_border"]: "3px solid #883c63"})
        }
        else {
            this.setState({[e.target.name + "_border"]: "1px solid rgba(0, 0, 0, 0.125)"})
        }
        this.changes[e.target.name] = e.target.value;
        this.setState({changes: this.changes})

        if (e.target.name === "standard_day") {
            this.setState({[e.target.name]: e.target.value})
            this.setState({standard_night: 24 - e.target.value})
        }
        this.setState({[e.target.name]: e.target.value})

    }

    handleColorChange(color, event) {
        if (this.state.control_level === 'control') {
            console.log("Event", event);
            console.log("Color", color.hex);
        }
    }

    getCurrentStats(device_uuid) {
        return fetch(process.env.REACT_APP_FLASK_URL + '/api/get_current_stats/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                'user_uuid': this.state.user_uuid,
                'user_token': this.props.cookies.get('user_token'),
                'selected_device_uuid': device_uuid
            })
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson)
                if (responseJson["response_code"] == 200) {
                    this.setState({current_temp: responseJson["results"]["current_temp"]})
                    this.setState({current_rh: responseJson["results"]["current_rh"]})
                    this.setState({current_co2: responseJson["results"]["current_co2"]})
                    this.setState({top_temp: responseJson["results"]["top_h2o_temp"]})
                    this.setState({middle_temp: responseJson["results"]["middle_h2o_temp"]})
                    this.setState({bottom_temp: responseJson["results"]["bottom_h2o_temp"]})

                    this.statecopy = this.state;
                }

            })
            .catch((error) => {
                console.error(error);
            });
    }

    getUserDevices() {
        return fetch(process.env.REACT_APP_FLASK_URL + '/api/get_user_devices/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                                      'user_token': this.props.cookies.get('user_token')
    })
    })
    .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson)
                if (responseJson["response_code"] == 200) {
                    const devices = responseJson["results"]["devices"];
                    let devices_map = new Map();
                    for (const device of devices) {
                        devices_map.set(device['device_uuid'], device);
                    }

                    this.setState({
                        user_devices: devices_map
                    }, () => {
                        if (!this.restoreSelectedDevice()) {
                            // default the selected device to the first/only dev.
                            this.onSelectDevice(devices[0].device_uuid)
                        }
                    });
                    console.log("Response", responseJson["results"])
                } else {
                    this.setState({
                        selected_device: 'No Devices',
                        selected_device_uuid: ''
                    });
                }
            })
    }

    restoreSelectedDevice = () => {
        const saved_device_uuid = this.props.cookies.get('selected_device_uuid', {path: '/'});
        if (!saved_device_uuid) return;

        const device = this.state.user_devices.get(saved_device_uuid);
        if (device) {
            this.onSelectDevice(saved_device_uuid);
            return true;
        }
        return false;
    }

    saveSelectedDevice = () => {
        const selected_device_uuid = this.state.selected_device_uuid;
        if (selected_device_uuid) {
            this.props.cookies.set('selected_device_uuid', selected_device_uuid, {path: '/'});
        } else {
            this.props.cookies.remove('selected_device_uuid', {path: '/'});
        }
    }

    onSubmitAccessCode = (modal_state) => {
        return fetch(process.env.REACT_APP_FLASK_URL + '/api/submit_access_code/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                'user_uuid': this.state.user_uuid,
                'user_token': this.props.cookies.get('user_token')
            })
        })
            .then((response) => response.json())
            .then((responseJson) => {
                if (responseJson["response_code"] == 200) {
                    this.toggleAccessCodeModal();
                    this.getUserDevices();
                } else {
                    this.setState({
                        access_code_error_message: responseJson['message']
                    });
                }
            })
            .catch((error) => {
                console.error(error);
            });
    }

    getCO2Details(device_uuid) {
        return fetch(process.env.REACT_APP_FLASK_URL + '/api/get_co2_details/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                'selected_device_uuid': device_uuid
            })
        })

            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson)
                if (responseJson["response_code"] == 200) {

                    let co2Data = responseJson["results"]

                    co2Data.forEach(function (d) {
                        d.value = parseFloat(d.value);
                    });

                    let co2_data_x = []
                    let co2_data_y = []
                    co2Data.forEach(function (d) {
                        co2_data_x.push(d.time);
                        co2_data_y.push(d.value);
                    });
                    this.setState({'co2_data_x': co2_data_x})
                    this.setState({'co2_data_y': co2_data_y})
                    this.setState({
                        'co2_data': [{
                            type: "scatter",
                            mode: "lines+markers",
                            name: '',
                            x: co2_data_x,
                            y: co2_data_y,
                            line: {color: '#ECAD48'}
                        }]
                    });

                    this.setState({
                        'co2_layout': {
                            width: 350,
                            height: 450,
                            xaxis: {
                                autorange: true,
                                tickformat: '%Y-%m-%dH:%M:%S',
                                rangeInput: {
                                    type: 'date'
                                }
                            },
                            yaxis: {
                                autorange: true,
                                type: 'linear'
                            }
                        }
                    });

                }

            })
            .catch((error) => {
                console.error(error);
            });
    }

    getHorticultureDailyLogs(device_uuid) {
        return fetch(process.env.REACT_APP_FLASK_URL + '/api/get_horticulture_daily_logs/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                'device_uuid': device_uuid
            })
        })

            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson)
                if (responseJson["response_code"] == 200) {

                    let plant_height_resultsData = responseJson["plant_height_results"]

                    plant_height_resultsData.forEach(function (d) {
                        d.value = parseFloat(d.value);
                    });

                    let plant_height_results_data_x = []
                    let plant_height_results_data_y = []
                    plant_height_resultsData.forEach(function (d) {
                        plant_height_results_data_x.push(d.time);
                        plant_height_results_data_y.push(d.value);
                    });
                    this.setState({'plant_height_results_data_x': plant_height_results_data_x})
                    this.setState({'plant_height_results_data_y': plant_height_results_data_y})
                    this.setState({
                        'plant_height_results_data': [{
                            type: "scatter",
                            mode: "lines+markers",
                            name: '',
                            x: plant_height_results_data_x,
                            y: plant_height_results_data_y,
                            line: {color: '#ECAD48'}
                        }]
                    });

                    this.setState({
                        'plant_height_results_layout': {
                            width: 350,
                            height: 450,
                            xaxis: {
                                autorange: true,
                                tickformat: '%Y-%m-%dH:%M:%S',
                                rangeInput: {
                                    type: 'date'
                                }
                            },
                            yaxis: {
                                autorange: true,
                                type: 'linear'
                            }
                        }
                    });
                    let
                        leaf_count_resultsData = responseJson["leaf_count_results"]

                    leaf_count_resultsData.forEach(function (d) {
                        d.value = parseFloat(d.value);
                    });

                    let
                        leaf_count_results_data_x = []
                    let
                        leaf_count_results_data_y = []
                    leaf_count_resultsData.forEach(function (d) {
                        leaf_count_results_data_x.push(d.time);
                        leaf_count_results_data_y.push(d.value);
                    });
                    this.setState({'leaf_count_results_data_x': leaf_count_results_data_x})
                    this.setState({'leaf_count_results_data_y': leaf_count_results_data_y})
                    this.setState({
                        'leaf_count_results_data': [{
                            type: "scatter",
                            mode: "lines+markers",
                            name: '',
                            x: leaf_count_results_data_x,
                            y: leaf_count_results_data_y,
                            line: {color: '#ECAD48'}
                        }]
                    });

                    this.setState({
                        'leaf_count_results_layout': {
                            width: 350,
                            height: 450,
                            xaxis: {
                                autorange: true,
                                tickformat: '%Y-%m-%dH:%M:%S',
                                rangeInput: {
                                    type: 'date'
                                }
                            },
                            yaxis: {
                                autorange: true,
                                type: 'linear'
                            }
                        }
                    });

                }

            })
            .catch((error) => {
                console.error(error);
            });
    }

    getTempDetails(device_uuid) {
        return fetch(process.env.REACT_APP_FLASK_URL + '/api/get_temp_details/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                'selected_device_uuid': device_uuid
            })
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson)
                if (responseJson["response_code"] == 200) {

                    let tempData = responseJson["results"]["temp"]
                    let RHData = responseJson["results"]["RH"]
                    let topTempData = responseJson["results"]["top_h2o_temp"]
                    let middleTempData = responseJson["results"]["middle_h2o_temp"]
                    let bottomTempData = responseJson["results"]["bottom_h2o_temp"]

                    tempData.forEach(function (d) {
                        d.value = parseFloat(d.value);
                    });
                    RHData.forEach(function (d) {
                        d.value = parseFloat(d.value)
                    });
                    topTempData.forEach(function (d) {
                        d.value = parseFloat(d.value);
                    });
                    middleTempData.forEach(function (d) {
                        d.value = parseFloat(d.value);
                    });
                    bottomTempData.forEach(function (d) {
                        d.value = parseFloat(d.value);
                    });

                    let rh_data_x = []
                    let rh_data_y = []
                    RHData.forEach(function (d) {
                        rh_data_x.push(d.time);
                        rh_data_y.push(d.value);
                    });
                    this.setState({'rh_data_x': rh_data_x})
                    this.setState({'rh_data_y': rh_data_y})
                    this.setState({
                        'rh_data': [{
                            type: "scatter",
                            mode: "lines",
                            name: '',
                            x: rh_data_x,
                            y: rh_data_y,
                            line: {color: '#95266A'}
                        }]
                    });

                    this.setState({
                        'rh_layout': {
                            width: 350,
                            height: 450,
                            xaxis: {
                                autorange: true,
                                tickformat: '%Y-%m-%dH:%M:%S',
                                rangeInput: {
                                    type: 'date'
                                }
                            },
                            yaxis: {
                                autorange: true,
                                type: 'linear'
                            }
                        }
                    });

                    let temp_data_x = []
                    let temp_data_y = []
                    tempData.forEach(function (d) {
                        temp_data_x.push(d.time);
                        temp_data_y.push(d.value);
                    });
                    this.setState({'temp_data_x': temp_data_x})
                    this.setState({'temp_data_y': temp_data_y})
                    this.setState({
                        'temp_data': [{
                            type: "scatter",
                            mode: "lines+markers",
                            name: '',
                            x: temp_data_x,
                            y: temp_data_y,
                            line: {color: '#008BC2'}
                        }]
                    });

                    let top_temp_data_x = []
                    let top_temp_data_y = []
                    topTempData.forEach(function (d) {
                        top_temp_data_x.push(d.time);
                        top_temp_data_y.push(d.value);
                    });
                    this.setState({'top_temp_data_x': top_temp_data_x})
                    this.setState({'top_temp_data_y': top_temp_data_y})
                    this.setState({
                        'top_temp_data': [{
                            type: "scatter",
                            mode: "lines+markers",
                            name: '',
                            x: top_temp_data_x,
                            y: top_temp_data_y,
                            line: {color: '#008BC2'}
                        }]
                    });

                    let middle_temp_data_x = []
                    let middle_temp_data_y = []
                    middleTempData.forEach(function (d) {
                        middle_temp_data_x.push(d.time);
                        middle_temp_data_y.push(d.value);
                    });
                    this.setState({'middle_temp_data_x': middle_temp_data_x})
                    this.setState({'middle_temp_data_y': middle_temp_data_y})
                    this.setState({
                        'middle_temp_data': [{
                            type: "scatter",
                            mode: "lines+markers",
                            name: '',
                            x: middle_temp_data_x,
                            y: middle_temp_data_y,
                            line: {color: '#008BC2'}
                        }]
                    });

                    let bottom_temp_data_x = []
                    let bottom_temp_data_y = []
                    bottomTempData.forEach(function (d) {
                        bottom_temp_data_x.push(d.time);
                        bottom_temp_data_y.push(d.value);
                    });
                    this.setState({'bottom_temp_data_x': bottom_temp_data_x})
                    this.setState({'bottom_temp_data_y': bottom_temp_data_y})
                    this.setState({
                        'bottom_temp_data': [{
                            type: "scatter",
                            mode: "lines+markers",
                            name: '',
                            x: bottom_temp_data_x,
                            y: bottom_temp_data_y,
                            line: {color: '#008BC2'}
                        }]
                    });

                    this.setState({
                        'temp_layout': {
                            width: 350,
                            height: 450,
                            xaxis: {
                                autorange: true,
                                tickformat: '%Y-%m-%dH:%M:%S',
                                rangeInput: {
                                    type: 'date'
                                }
                            },
                            yaxis: {
                                autorange: true,
                                type: 'linear'
                            }
                        }
                    });

                    this.setState({'show_temp_line': true})
                }
            })
            .catch((error) => {
                console.error(error);
            });
    }

    getRecipeOnDevice(device_uuid) {
        return fetch(process.env.REACT_APP_FLASK_URL + '/api/get_current_recipe/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                'selected_device_uuid': device_uuid
            })
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson, "recipe")
                if (responseJson["response_code"] === 200) {
                    this.setState({current_recipe: (responseJson["results"])})
                    this.setLEDStates();
                }
            })
            .catch((error) => {
                console.error(error);
            });
    }


    toggleTempData() {
        this.setState({'show_temp_line': !this.state.show_temp_line})
    }

    toggleRHData() {
        this.setState({'show_rh_line': !this.state.show_rh_line})
    }

    onSelectDevice = (device_uuid) => {
        if (device_uuid != this.state.selected_device_uuid) {
            const device = this.state.user_devices.get(device_uuid);
            const name = `${device.device_name} (${device.device_reg_no})`;
            this.setState({
                selected_device: name,
                selected_device_uuid: device.device_uuid,
                control_level: device.permission,
                current_rh: 'Loading',
                current_temp: 'Loading',
                current_co2: 'Loading'
            }, this.saveSelectedDevice);

            this.getTempDetails(device_uuid);
            this.getCO2Details(device_uuid);
            this.getCurrentStats(device_uuid);
            this.getRecipeOnDevice(device_uuid);
            this.getHorticultureDailyLogs(device_uuid);
        }
    }

    echo(text) {

        this.child.console.log(text);
        this.setState({
            count: this.state.count + 1,
        }, this.child.console.return);
    }

    promptLabel = () => {
        return this.state.count + "> ";
    }

    toggle_action_drop() {
        this.setState({action_isOpen: !this.state.action_isOpen})
    }

    downloadCSV() {
        return fetch(process.env.REACT_APP_FLASK_URL + '/api/download_as_csv/', {
            method: 'POST',
            headers: {
                'Accept': 'text/csv',
                'Content-Type': 'text/csv',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                'user_token': this.props.cookies.get('user_token')
            })
        }).then(function (response) {
            return response.blob();
        }).then(function (blob) {
            FileSaver.saveAs(blob, 'data.csv');
        })
    }

    accessChamber() {
        this.setState({selectedAction: "Log Chamber Access Only"})
        return fetch(process.env.REACT_APP_FLASK_URL + '/api/submit_access_chamber/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                'user_token': this.props.cookies.get('user_token'),
                'device_uuid': this.state.selected_device_uuid
            })
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson)

            })
            .catch((error) => {
                console.error(error);
            });
    }

    submitRecipe() {
        window.location.href = "/horticulture_success/" + this.state.selected_device_uuid.toString();
    }

    handleApplySubmit() {
        console.log(this.state)
        return fetch(process.env.REACT_APP_FLASK_URL + '/api/submit_recipe_change/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                'user_token': this.props.cookies.get('user_token'),
                'recipe_state': JSON.stringify(this.state),
                'device_uuid': this.state.selected_device_uuid
            })
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson)
                this.toggleApplyConfirmation();
                window.location.reload()
            })
            .catch((error) => {
                console.error(error);
            });
    }

    goToHarvest() {
        window.location.href = "/harvest/" + this.state.selected_device_uuid.toString();

    }

    render() {
        const margin = {top: 20, right: 20, bottom: 30, left: 50};
        let changesList = []
        let changeJson = this.state.changes;

        if (this.state.changes) {
            changesList = Object.keys(changeJson).map(function (keyName, keyIndex) {

                if (keyName !== "led_panel_dac5578" && keyName !== "led_panel_dac5578") {
                    return <div className="row"><p key={keyName}>{displayNamesLookup[keyName]}
                        : {changeJson[keyName].toString()}</p><br/></div>
                }
                else if ((keyName === "led_panel_dac5578" || keyName === "led_panel_dac5578") && changeJson[keyName]) {


                    let list_led = [<p key={keyName}>Color channel information for {displayNamesLookup[keyName]}</p>]
                    let json_data = changeJson[keyName]
                    let colorsJson = []
                    colorsJson = Object.keys(json_data).map(function (keyName, keyIndex) {
                        return <p key={keyName}>{displayNamesLookup[keyName]} : {json_data[keyName]}</p>
                    })
                    list_led.push(colorsJson);
                    return list_led
                }

            })
        }

        return (

            <div className="device-homepage-container">
                <div className="row dropdown-row">
                    <div className="col-md-2">
                        <DevicesDropdown
                            devices={[...this.state.user_devices.values()]}
                            selectedDevice={this.state.selected_device}
                            onSelectDevice={this.onSelectDevice}
                            onAddDevice={this.toggleDeviceModal}
                            onAddAccessCode={this.toggleAccessCodeModal}
                        />
                    </div>

                    {/* TODO: make this stuff work
                    <div className="col-md-7">
                        <Dropdown isOpen={this.state.action_isOpen} toggle={this.toggle_action_drop}>
                            <DropdownToggle caret>
                                {this.state.selectedAction}
                            </DropdownToggle>
                            <DropdownMenu>
                                <DropdownItem onClick={this.accessChamber}>Log chamber access only</DropdownItem>
                                <DropdownItem onClick={this.submitRecipe}>Take Horticulture
                                    Measurements </DropdownItem>
                                <DropdownItem onClick={this.downloadCSV}>Download data </DropdownItem>
                                <DropdownItem onClick={this.toggleEditMode}>Edit Climate Recipe </DropdownItem>
                                <DropdownItem onClick={this.goToHarvest}>Harvest Plant </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                    */}

                    <div className="col-md-1">
                    </div>
                    <div className="col-md-2 no-padding">

                    </div>
                </div>
                <div className="row graphs-row">
                    {/*<Draggable cancel="strong">*/}
                    <div className="col-md-4">
                        <div className="card current-stats-card">
                            <div className="card-block">
                                <h4 className="card-title "> Air Temperature </h4>
                                <div className="card-text">
                                    <div className="graph">
                                        <div className="knob_data">{this.state.current_temp}
                                        </div>
                                        <span className="txt_smaller"><sup>o</sup>C (Celsius) </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/*</Draggable>*/}
                    {/*<Draggable cancel="strong">*/}
                    <div className="col-md-4">
                        <div className="card current-stats-card">
                            <div className="card-block">
                                <h4 className="card-title "> Relative Humidity </h4>
                                <div className="card-text">
                                    <div className="graph">
                                        <div className="knob_data">{this.state.current_rh}
                                        </div>
                                        <span className="txt_smaller"><sup>o</sup>% (Percent) </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {this.state.BCC ? null :
                    <div className="col-md-4">
                        <div className="card current-stats-card">
                            <div className="card-block">
                                <h4 className="card-title "> CO2 </h4>
                                <div className="card-text">
                                    <div className="graph">
                                        <div className="knob_data">{this.state.current_co2}
                                        </div>
                                        <span className="txt_smaller"><sup>o</sup>ppm (Parts per million) </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    }
                </div>


                <div className="row graphs-row">
                    {/*<Draggable cancel="strong">*/}
                    <div className="col-md-4">
                        <div className="card value-card">
                            <div className="card-block">
                                <h4 className="card-title "> Air Temperature </h4>
                                <div className="row plot-row" style={{display: 'block'}}>
                                    <strong className="no-cursor"> <Plot data={this.state.temp_data}
                                                                         layout={this.state.temp_layout}
                                                                         onInitialized={(figure) => this.setState(figure)}
                                                                         onUpdate={(figure) => this.setState(figure)}/>
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/*</Draggable>*/}
                    {/*<Draggable cancel="strong">*/}
                    <div className="col-md-4">

                        <div className="card value-card">
                            <div className="card-block">
                                <h4 className="card-title "> Relative Humidity </h4>

                                <div className="row plot-row" style={{display: 'block'}}>
                                    <strong className="no-cursor"> <Plot data={this.state.rh_data}
                                                                         layout={this.state.rh_layout}
                                                                         onInitialized={(figure) => this.setState(figure)}
                                                                         onUpdate={(figure) => this.setState(figure)}/>
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {this.state.BCC ? null :
                    <div className="col-md-4">
                        <div className="card value-card">
                            <div className="card-block">
                                <h4 className="card-title "> CO2 </h4>

                                <div className="row plot-row" style={{display: 'block'}}>
                                    <strong className="no-cursor"> <Plot data={this.state.co2_data}
                                                                         layout={this.state.co2_layout}
                                                                         onInitialized={(figure) => this.setState(figure)}
                                                                         onUpdate={(figure) => this.setState(figure)}
                                                                         config={this.state.config}/>
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>
                    }
                </div>

                {this.state.BCC ? <div>
                <div className="row graphs-row">
                    <div className="col-md-4">
                        <div className="card current-stats-card">
                            <div className="card-block">
                                <h4 className="card-title "> Top H2O Temperature </h4>
                                <div className="card-text">
                                    <div className="graph">
                                        <div className="knob_data">{this.state.top_temp}
                                        </div>
                                        <span className="txt_smaller"><sup>o</sup>C (Celsius) </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card current-stats-card">
                            <div className="card-block">
                                <h4 className="card-title "> Middle H2O Temperature </h4>
                                <div className="card-text">
                                    <div className="graph">
                                        <div className="knob_data">{this.state.middle_temp}
                                        </div>
                                        <span className="txt_smaller"><sup>o</sup>C (Celsius) </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card current-stats-card">
                            <div className="card-block">
                                <h4 className="card-title "> Bottom H2O Temperature </h4>
                                <div className="card-text">
                                    <div className="graph">
                                        <div className="knob_data">{this.state.bottom_temp}
                                        </div>
                                        <span className="txt_smaller"><sup>o</sup>C (Celsius) </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="row graphs-row">
                    <div className="col-md-4">
                        <div className="card value-card">
                            <div className="card-block">
                                <h4 className="card-title "> Top H2O Temperature </h4>
                                <div className="row plot-row" style={{display: 'block'}}>
                                    <strong className="no-cursor"> <Plot data={this.state.top_temp_data}
                                                                         layout={this.state.temp_layout}
                                                                         onInitialized={(figure) => this.setState(figure)}
                                                                         onUpdate={(figure) => this.setState(figure)}/>
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card value-card">
                            <div className="card-block">
                                <h4 className="card-title "> Middle H2O Temperature </h4>

                                <div className="row plot-row" style={{display: 'block'}}>
                                    <strong className="no-cursor"> <Plot data={this.state.middle_temp_data}
                                                                         layout={this.state.temp_layout}
                                                                         onInitialized={(figure) => this.setState(figure)}
                                                                         onUpdate={(figure) => this.setState(figure)}/>
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card value-card">
                            <div className="card-block">
                                <h4 className="card-title "> Bottom H2O Temperature </h4>

                                <div className="row plot-row" style={{display: 'block'}}>
                                    <strong className="no-cursor"> <Plot data={this.state.bottom_temp_data}
                                                                         layout={this.state.temp_layout}
                                                                         onInitialized={(figure) => this.setState(figure)}
                                                                         onUpdate={(figure) => this.setState(figure)}/>
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
                : 
                <div className="row graphs-row">
                    {/*<Draggable cancel="strong">*/}
                    <div className="col-md-4">
                        <div className="card value-card">
                            <div className="card-block">
                                <h4 className="card-title "> Plant Height </h4>
                                <div className="row plot-row" style={{display: 'block'}}>
                                    <strong className="no-cursor"> <Plot data={this.state.plant_height_results_data}
                                                                         layout={this.state.plant_height_results_layout}
                                                                         onInitialized={(figure) => this.setState(figure)}
                                                                         onUpdate={(figure) => this.setState(figure)}/>
                                    </strong>
                                </div>
                            </div>
                        </div>
                     </div>
                     <div className="col-md-4">
                        <div className="card value-card">
                            <div className="card-block">
                                <h4 className="card-title "> Number of Leaves </h4>
                                <div className="row plot-row" style={{display: 'block'}}>
                                    <strong className="no-cursor"> <Plot data={this.state.leaf_count_results_data}
                                                                         layout={this.state.leaf_count_results_layout}
                                                                         onInitialized={(figure) => this.setState(figure)}
                                                                         onUpdate={(figure) => this.setState(figure)}/>
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div> 
                }

                {this.state.edit_mode ? <div className="edit-container">
                    <div className="row graphs-row">
                        <div className="col-md-6 edit-text"> Edit Climate Recipe</div>
                    </div>
                    <div className="row graphs-row">
                        <div className="col-md-6">
                            <LEDSpectrumOptions led_panel_dac5578={this.state.led_panel_dac5578}
                                                onLEDPanelChange={(led_name, color_channel, value) => this.LEDPanelChange(led_name, color_channel, value)}
                                                onLEDSpectrumSelection={(led_data_type, color_channel, spectrum_type, value) => this.LEDSpectrumSelection(led_data_type, color_channel, spectrum_type, value)}
                                                title="LED Panel - ON" prefix="on"/>
                        </div>
                        <div className="col-md-6">
                            <LEDSpectrumOptions led_panel_dac5578={this.state.led_panel_dac5578}
                                                onLEDPanelChange={(led_name, color_channel, value) => this.LEDPanelChange(led_name, color_channel, value)}
                                                onLEDSpectrumSelection={(led_data_type, color_channel, spectrum_type, value) => this.LEDSpectrumSelection(led_data_type, color_channel, spectrum_type, value)}
                                                title="LED Panel - OFF" prefix="off"/>

                        </div>
                    </div>
                    <div className="row graphs-row">
                        {/*<Draggable cancel="strong">*/}
                        <div className="col-md-6">
                            <div className="card environment-card">
                                <div className="card-block">
                                    <h4 className="card-title "> Standard Day</h4>
                                    <div className="card-text">
                                        <div className="graph">
                                            <strong className="no-cursor">

                                                <span className="txt_smaller"></span>
                                                <div className="knob_data">
                                                    <input type="text" className="recipe-details-text"
                                                           placeholder="" id="standard_day"
                                                           value={this.state.standard_day}
                                                           name="standard_day" onChange={this.sensorOnChange}/>
                                                </div>
                                                <span className="txt_smaller">hours</span>

                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/*</Draggable>*/}
                        {/*<Draggable cancel="strong">*/}
                        <div className="col-md-6">
                            <div className="card environment-card">
                                <div className="card-block">
                                    <h4 className="card-title "> Standard Night </h4>
                                    <div className="card-text">
                                        <div className="graph">

                                            <strong className="no-cursor">

                                                <span className="txt_smaller"></span>
                                                <div className="knob_data">
                                                    <input type="number" className="recipe-details-text"
                                                           placeholder=""
                                                           id="standard_night" name="standard_night"
                                                           value={this.state.standard_night}/>
                                                </div>
                                                <span className="txt_smaller">hours</span>

                                            </strong>
                                        </div>


                                    </div>
                                </div>
                            </div>
                        </div>


                        {/*</Draggable>*/}
                    </div>
                    <div className="row graphs-row">
                        <div className="col-md-8">
                        </div>
                        <div className="col-md-4 color-button">
                            {this.state.edit_mode ?
                                <button className="apply-button btn btn-secondary" onClick={this.checkApply}>
                                    Apply Changes
                                </button> : null}
                        </div>

                    </div>

                </div> : null}

                <AddDeviceModal
                    isOpen={this.state.add_device_modal}
                    toggle={this.toggleDeviceModal}
                    onSubmit={this.onSubmitDevice}
                    error_message={this.state.add_device_error_message}
                />
                <AddAccessCodeModal
                    isOpen={this.state.add_access_modal}
                    toggle={this.toggleAccessCodeModal}
                    onSubmit={this.onSubmitAccessCode}
                    error_message={this.state.access_code_error_message}
                />
                <DeviceIsRunningModal
                    isOpen={this.state.apply_confirmation_modal}
                    toggle={this.toggleApplyConfirmation}
                    onApplyToDevice={this.handleApplySubmit}
                    className={this.props.className}
                />
            </div>
        )

    }
}

export default withCookies(DeviceHomepage);
