//
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
//
// Microsoft Bot Framework: http://botframework.com
//
// Bot Framework Emulator Github:
// https://github.com/Microsoft/BotFramwork-Emulator
//
// Copyright (c) Microsoft Corporation
// All rights reserved.
//
// MIT License:
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED ""AS IS"", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import {
  AutoComplete,
  Checkbox,
  DefaultButton,
  Dialog,
  DialogFooter,
  PrimaryButton,
  Row,
  TextField,
} from '@bfemulator/ui-react';
import * as React from 'react';
import { ChangeEvent, Component, MouseEvent, ReactNode } from 'react';
import { EmulatorMode } from '@bfemulator/sdk-shared';

import * as openBotStyles from './openBotDialog.scss';

export interface OpenBotDialogProps {
  mode?: EmulatorMode;
  isDebug?: boolean;
  onDialogCancel?: () => void;
  openBot?: (state: OpenBotDialogState) => void;
  savedBotUrls?: { url: string; lastAccessed: string }[];
  sendNotification?: (error: Error) => void;
  switchToBot?: (path: string) => void;
}

export interface OpenBotDialogState {
  isDebug?: boolean;
  mode?: EmulatorMode;
  botUrl?: string;
  appId?: string;
  appPassword?: string;
  isAzureGov?: boolean;
}

enum ValidationResult {
  Invalid,
  RouteMissing,
  Valid,
  Empty,
}

export class OpenBotDialog extends Component<OpenBotDialogProps, OpenBotDialogState> {
  private static getErrorMessage(result: ValidationResult): string {
    if (result === ValidationResult.Empty || result === ValidationResult.Valid) {
      return ''; // Allow empty endpoints
    }

    return result === ValidationResult.Invalid
      ? 'Please choose a valid bot file or endpoint URL'
      : `Please include route if necessary: "/api/messages"`;
  }

  private static validateEndpoint(endpoint: string): ValidationResult {
    if (!endpoint) {
      return ValidationResult.Empty;
    }

    if (/(http)(s)?(:\/\/)[\w+]/.test(endpoint)) {
      return endpoint.endsWith('/api/messages') ? ValidationResult.Valid : ValidationResult.RouteMissing;
    }

    return endpoint.endsWith('.bot') ? ValidationResult.Valid : ValidationResult.Invalid;
  }

  public static getDerivedStateFromProps(
    newProps: OpenBotDialogProps = {},
    newState: OpenBotDialogState = {}
  ): OpenBotDialogState {
    let { mode = 'livechat' } = newProps;
    const { isDebug } = newProps;
    if (isDebug) {
      mode = 'debug';
      if (!(newState.botUrl || '').startsWith('http')) newState.botUrl = '';
    }
    return { ...newState, mode, isDebug };
  }

  constructor(props: OpenBotDialogProps) {
    super(props);
    const { mode = 'livechat' } = props;
    this.state = {
      botUrl: '',
      appId: '',
      appPassword: '',
      isDebug: false,
      mode,
      isAzureGov: false,
    };
  }

  public render(): ReactNode {
    const { savedBotUrls = [] } = this.props;
    const { botUrl, appId, appPassword, mode, isDebug, isAzureGov } = this.state;
    const validationResult = OpenBotDialog.validateEndpoint(botUrl);
    const errorMessage = OpenBotDialog.getErrorMessage(validationResult);
    const shouldBeDisabled =
      validationResult === ValidationResult.Invalid || validationResult === ValidationResult.Empty;
    const botUrlLabel = 'Bot URL';

    return (
      <Dialog cancel={this.props.onDialogCancel} className={openBotStyles.themeOverrides} title="Open a bot">
        <form onSubmit={this.onSubmit}>
          <div className={openBotStyles.autoCompleteBar}>
            <AutoComplete
              autoFocus={true}
              errorMessage={errorMessage}
              label={botUrlLabel}
              items={savedBotUrls.map(elem => elem.url).slice(0, 9)}
              onChange={this.onBotUrlChange}
              placeholder={botUrlLabel}
              value={this.state.botUrl}
            />
            {this.browseButton}
          </div>
          <Row className={openBotStyles.multiInputRow}>
            <TextField
              inputContainerClassName={openBotStyles.inputContainerRow}
              name="appId"
              label="Microsoft App ID"
              onChange={this.onInputChange}
              placeholder="Optional"
              value={appId}
            />
            <TextField
              inputContainerClassName={openBotStyles.inputContainerRow}
              label="Microsoft App password"
              name="appPassword"
              onChange={this.onInputChange}
              placeholder="Optional"
              type="password"
              value={appPassword}
            />
          </Row>
          <Row className={openBotStyles.rowOverride}>
            <Checkbox
              label="Open in debug mode"
              checked={isDebug && mode === 'debug'}
              onClick={this.onDebugCheckboxClick}
            />
          </Row>
          <Row className={openBotStyles.rowOverride}>
            <Checkbox
              label="Azure for US Government"
              checked={isAzureGov}
              onClick={this.onChannelServiceCheckboxClick}
            />
            <a href="https://aka.ms/bot-framework-emulator-azuregov">&nbsp;Learn more.</a>
          </Row>
          <DialogFooter>
            <DefaultButton type="button" onClick={this.props.onDialogCancel}>
              Cancel
            </DefaultButton>
            <PrimaryButton type="submit" disabled={shouldBeDisabled}>
              Connect
            </PrimaryButton>
          </DialogFooter>
        </form>
      </Dialog>
    );
  }

  private onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { type, files, value, name } = event.target;
    const newValue = type === 'file' ? files.item(0).path : value;
    this.setState({ [name]: newValue });
  };

  private onChannelServiceCheckboxClick = (event: MouseEvent<HTMLInputElement>) => {
    const { checked: isAzureGov } = event.currentTarget;
    const newState = { ...this.state, isAzureGov } as OpenBotDialogState;

    if (isAzureGov && !this.state.botUrl.startsWith('http')) {
      newState.botUrl = '';
    }

    this.setState(newState);
  };

  private onDebugCheckboxClick = (event: MouseEvent<HTMLInputElement>) => {
    const { checked: isDebug } = event.currentTarget;
    const newState = { isDebug, mode: isDebug ? 'debug' : 'livechat-url' } as OpenBotDialogState;

    if (isDebug && !this.state.botUrl.startsWith('http')) {
      newState.botUrl = '';
    }

    this.setState(newState);
  };

  private onBotUrlChange = (botUrl: string) => {
    const newState = { botUrl } as OpenBotDialogState;
    newState.mode = botUrl.startsWith('http') ? 'livechat-url' : 'livechat';
    this.setState({ botUrl });
  };

  private onSubmit = () => {
    this.props.openBot(this.state);
  };

  private get browseButton(): React.ReactNode {
    if (!this.state.isAzureGov && !this.state.isDebug) {
      return (
        <PrimaryButton className={openBotStyles.browseButton}>
          Browse
          <input
            accept=".bot"
            className={openBotStyles.fileInput}
            name="botUrl"
            onChange={this.onInputChange}
            type="file"
          />
        </PrimaryButton>
      );
    }
    return null;
  }
}
