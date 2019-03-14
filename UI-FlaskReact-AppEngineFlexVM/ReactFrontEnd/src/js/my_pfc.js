import React, {Component} from 'react';
import "../scss/my_pfc.scss";
import {Cookies, withCookies} from "react-cookie";
import {$, jQuery} from 'jquery';
import {DevicesDropdown} from './components/devices_dropdown';
import {ViewEditToggle} from './components/view_edit_toggle';
import 'rc-time-picker/assets/index.css';
import 'react-console-component/main.css';
import Slider from 'rc-slider';
import Tooltip from 'rc-tooltip';

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

class MyPFC extends Component {
    constructor(props) {
        super(props);
        this.state = {
            user_devices: new Map(),
            selected_device: 'Loading',
            isEdit: false,
            selected_peripherals: "",
            num_peripherals: 0
        }


        this.getCurrentStats = this.getCurrentStats.bind(this);
        this.toggleDeviceModal = this.toggleDeviceModal.bind(this);
        this.toggleAccessCodeModal = this.toggleAccessCodeModal.bind(this);
        this.getUserDevices = this.getUserDevices.bind(this);
        this.onSelectDevice = this.onSelectDevice.bind(this);
        this.toggleViewEdit = this.toggleViewEdit.bind(this);
        this.get_peripherals = this.get_peripherals.bind(this);
    }

    toggleViewEdit() {
        this.setState({isEdit: !this.state.isEdit})
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
                'user_uuid': this.state.user_uuid,
                'user_token': this.props.cookies.get('user_token')
            })
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson)
                if (responseJson["response_code"] == 200) {

                    var devs = responseJson["results"]; // assign array
                    var device_uuid = 'None'
                    if (devs.length > 0) {         // if we have devices
                        // default the selected device to the first/only dev.
                        var name = devs[0].device_name + ' (' +
                            devs[0].device_reg_no + ')';
                        device_uuid = devs[0].device_uuid;
                        this.setState({
                            selected_device: name,
                            selected_device_uuid: device_uuid
                        });


                        this.get_peripherals(devs[0].peripherals)

                        // this.getDeviceImages(device_uuid);
                    }

                    let devices = new Map();
                    for (const device of responseJson['results']) {
                        devices.set(device['device_uuid'], device);
                    }
                    this.setState({user_devices: devices});
                } else {
                    this.setState({selected_device: 'No Devices'});
                }
            })
            .catch((error) => {
                console.error(error);
            });
    }

    get_peripherals(peripherals) {

        return fetch(process.env.REACT_APP_FLASK_URL + "/api/get_device_peripherals/", {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                'selected_peripherals': peripherals,
                'user_token': this.props.cookies.get('user_token')
            })
        })
            .then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson)
                if (responseJson["response_code"] == 200) {
                    let resultJson = responseJson["results"]
                    this.setState({peripherals: resultJson})
                    this.setState({num_peripherals: resultJson.length})
                }
            })
            .catch((error) => {
                console.error(error);
            });
    }

    componentDidMount() {
        this.getUserDevices();
    }

    getCurrentStats() {

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

    onSelectDevice(e) {


        this.setState({
            selected_device: e.target.textContent,
            selected_device_uuid: e.target.value
        });

        this.state.user_devices.forEach((value, key) => {

            if (key === this.state.selected_device_uuid) {
                this.setState({selected_peripherals: value['peripherals']})
                this.get_peripherals(value['peripherals'])
            }

        });


    }

    render() {

        let listPeripherals = []
        for (let peripheral in this.state.peripherals) {
            let peripheral_value = this.state.peripherals[peripheral]

            listPeripherals.push(<div className="col-md-4">
                    <div className="card stats-card">
                        <div className="card-block">
                            <div className="card-text">

                            </div>
                            <div className="card-footer" style={{backgroundColor: peripheral_value.color}}><h4> {peripheral_value.name} </h4></div>
                        </div>
                    </div>
                </div>
            )
        }

        let listGraphs = []
        for (let peripheral in this.state.peripherals) {
            let peripheral_value = this.state.peripherals[peripheral]
            listGraphs.push(<div className="col-md-6">
                    <div className="card graph-card">
                        <div className="card-block">
                            <div className="card-text">

                            </div>
                        </div>
                    </div>
                </div>
            )
        }
        listGraphs.push(<div className="col-md-6">
                    <div className="card graph-card">
                        <div className="card-block">
                            <div className="card-text">

                            </div>
                        </div>
                    </div>
                </div>
            )
        return (<div className="mypfc-container">
               dsgfdsgdfag <Slider max={255} min={0}/>
                <div className="row">
                    <div className="col-md-6"><DevicesDropdown
                        devices={[...this.state.user_devices.values()]}
                        selectedDevice={this.state.selected_device}
                        onSelectDevice={this.onSelectDevice}
                        onAddDevice={this.toggleDeviceModal}
                        onAddAccessCode={this.toggleAccessCodeModal}
                    /></div>
                    <div className="col-md-6">
                        <ViewEditToggle onSelectMode={this.toggleViewEdit}/>
                    </div>
                </div>
                <div className="row peripheral-row">
                    {listPeripherals}
                </div>
                 <div className="row graph-row">
                    {listGraphs}
                </div>
            </div>
        )
    }
}

export default withCookies(MyPFC);
