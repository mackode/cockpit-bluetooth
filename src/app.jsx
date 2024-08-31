/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2017 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

import cockpit from 'cockpit';
import React from 'react';
import { Alert, Card, CardTitle, CardBody, Button, Spinner } from '@patternfly/react-core';
import { CpuIcon } from '@patternfly/react-icons/dist/esm/icons/';

const _ = cockpit.gettext;

export class Application extends React.Component {
    constructor() {
        super();
        this.state = { devices: [], intervalId: {}, alert: null, isShowBtnInstall: false, isShowLoading: false, isError: false };
    }

    componentDidMount() {
        const intervalId = setInterval(() => {
            if (!this.state.isShowBtnInstall && !this.state.isError)
                this.loadDevices();
        }, 1000);
        this.setState({ intervalId });
    }

    componentWillUnmount() {
        clearInterval(this.state.intervalId);
    }

    loadDevices = () => {
        cockpit
                .spawn(["bluetoothctl", "devices"], { err: "message", superuser: "try" })
                .done((success) => {
                        const devicesArray = [];
                        success.split(/\n\s*\n/).forEach(element => {
                            let index = 0;
  
                            const device = element.trim();
                            devicesArray.push(device);

                            index += 1;
                        });
                        this.setState({ devices: devicesArray, isShowBtnInstall: false });
                })
                .fail((err) => {
                    if (err.message === "not-found") {
                        this.setState({ isShowBtnInstall: true });
                        this.setAlert(_('bluetoothctl not found, you want install it ?'), 'danger');
                        this.getBluetoothInstallCmd(0);
                        return;
                    }

                    this.setAlert(err.message, 'warning');
                    clearInterval(this.state.intervalId);
                });
    };

    setIcon = () => {
        return <CpuIcon size='md' />;
    };

    setAlert = (msg, variant) => {
        this.setState({ alert: { msg, variant } });
    };

    lstPacktsManager = ["apk", "apt-get", "dnf", "zypper"];
    installCmd = null;
    getBluetoothInstallCmd = async (index) => {
        const cmd = this.lstPacktsManager[index];
        await cockpit.spawn([cmd, "-v"])
                .then((success) => {
                    switch (cmd) {
                    case "apk":
                        this.installCmd = [cmd, "add", "--no-cache", "bluez", "-y"];
                        break;
                    case "dnf":
                        this.installCmd = [cmd, "install", "bluez", "-y"];
                        break;
                    case "zypper":
                        this.installCmd = [cmd, "install", "-y", "bluez"];
                        break;
                    case "apt-get":
                    default:
                        this.installCmd = [cmd, "install", "bluez", "-y"];
                    }
                })
                .fail((e) => {
                    this.getBluetoothInstallCmd(index + 1);
                });
    };

    handleInstallBluetooth = async () => {
        this.setState({ isShowLoading: true });
        cockpit.spawn(this.installCmd, { err: "message", superuser: "require" })
                .done((success) => {
                    this.setState({ isShowLoading: false, isShowBtnInstall: false, alert: null });
                    cockpit.spawn(["bluetoothctl", "scan on"], { err: "message", superuser: "require" })
                            .done((success) => {
                            })
                            .fail((err) => {
                                this.setAlert(err.message, 'warning');
                            });
                })
                .fail((err) => {
                    this.setState({ isShowLoading: false, isShowBtnInstall: true });
                    this.setAlert(err.message, 'warning');
                });
    };

    render() {
        const { devices, alert, isShowBtnInstall, isShowLoading } = this.state;
        return (
            <>
                <Card>
                    <CardTitle>{_('Devices')}</CardTitle>
                    <CardBody>
                        {isShowLoading ? <Spinner isSVG /> : <></>}
                        {alert != null ? <Alert variant={alert.variant}>{alert.msg}</Alert> : <></>}
                        {isShowBtnInstall ? <Button onClick={this.handleInstallBluetooth}>{_('Install')}</Button> : <></>}

                        {devices !== null
                            ? devices.map((key) => {
                                return (
                                    <Card key={key}>
                                        <CardTitle>{this.setIcon()} {key}</CardTitle>
                                    </Card>
                                );
                            }
                            )
                            : ''}
                    </CardBody>
                </Card>
            </>
        );
    }
}
