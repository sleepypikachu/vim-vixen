import messages from 'shared/messages';
import * as consoleActions from 'console/actions/console';

const inputShownMode = (state) => {
  return ['command', 'find'].includes(state.mode);
};

export default class ConsoleComponent {
  constructor(wrapper, store) {
    this.wrapper = wrapper;
    this.store = store;
    this.prevMode = '';

    let doc = this.wrapper.ownerDocument;
    let input = doc.querySelector('#vimvixen-console-command-input');

    input.addEventListener('blur', this.onBlur.bind(this));
    input.addEventListener('keydown', this.onKeyDown.bind(this));
    input.addEventListener('input', this.onInput.bind(this));

    store.subscribe(() => {
      this.update();
    });
    this.update();
  }

  onBlur() {
    return browser.runtime.sendMessage({
      type: messages.CONSOLE_BLURRED,
    });
  }

  onKeyDown(e) {
    let doc = this.wrapper.ownerDocument;
    let input = doc.querySelector('#vimvixen-console-command-input');

    switch (e.keyCode) {
    case KeyboardEvent.DOM_VK_ESCAPE:
      return input.blur();
    case KeyboardEvent.DOM_VK_RETURN:
      return browser.runtime.sendMessage({
        type: messages.CONSOLE_ENTERED,
        text: e.target.value
      }).then(this.onBlur);
    case KeyboardEvent.DOM_VK_TAB:
      if (e.shiftKey) {
        this.store.dispatch(consoleActions.completionPrev());
      } else {
        this.store.dispatch(consoleActions.completionNext());
      }
      e.stopPropagation();
      e.preventDefault();
      break;
    }
  }

  onInput(e) {
    this.store.dispatch(consoleActions.setConsoleText(e.target.value));

    let source = e.target.value;
    return browser.runtime.sendMessage({
      type: messages.CONSOLE_QUERY_COMPLETIONS,
      text: source,
    }).then((completions) => {
      this.store.dispatch(consoleActions.setCompletions(source, completions));
    });
  }

  onInputShown(state) {
    let doc = this.wrapper.ownerDocument;
    let input = doc.querySelector('#vimvixen-console-command-input');

    input.focus();
    window.focus();

    if (state.mode === 'command') {
      this.onInput({ target: input });
    }
  }

  update() {
    let state = this.store.getState();

    this.updateMessage(state);
    this.updateCommand(state);
    this.updatePrompt(state);

    if (this.prevMode !== state.mode && inputShownMode(state)) {
      this.onInputShown(state);
    }
    this.prevMode = state.mode;
  }

  updateMessage(state) {
    let doc = this.wrapper.ownerDocument;
    let box = doc.querySelector('.vimvixen-console-message');
    let display = 'none';
    let classList = ['vimvixen-console-message'];

    if (state.mode === 'error' || state.mode === 'info') {
      display = 'block';
      classList.push('vimvixen-console-' + state.mode);
    }

    box.className = classList.join(' ');
    box.style.display = display;
    box.textContent = state.messageText;
  }

  updateCommand(state) {
    let doc = this.wrapper.ownerDocument;
    let command = doc.querySelector('#vimvixen-console-command');
    let input = doc.querySelector('#vimvixen-console-command-input');

    let display = 'none';
    if (inputShownMode(state)) {
      display = 'block';
    }

    command.style.display = display;
    input.value = state.consoleText;
  }

  updatePrompt(state) {
    let classList = ['vimvixen-console-command-prompt'];
    if (inputShownMode(state)) {
      classList.push('prompt-' + state.mode);
    }

    let doc = this.wrapper.ownerDocument;
    let ele = doc.querySelector('.vimvixen-console-command-prompt');
    ele.className = classList.join(' ');
  }
}
