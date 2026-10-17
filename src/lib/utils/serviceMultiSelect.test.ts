import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { initServiceMultiSelect } from "./serviceMultiSelect.ts";

// Keyboard handling of the shared service multi-select, run on a linkedom DOM
// (already a dev dependency). linkedom does not track focus or provide
// KeyboardEvent, so focus is stubbed and key events are plain cancelable
// events with a `key` property. Native browser actions (the click a real
// Space key performs on keyup unless keydown is prevented) do not exist here;
// what this test guards is that the handler prevents them.

const setup = (isLocked = () => false) => {
  const { window, document } = parseHTML(`<html><body><form>
    <div id="root">
      <button type="button" data-services-trigger aria-expanded="false">
        <span data-services-trigger-text data-placeholder="Select one or more services"></span>
      </button>
      <div data-services-panel hidden>
        <input type="checkbox" value="AC Repair" data-service-option>
        <input type="checkbox" value="Heating Repair" data-service-option>
        <input type="checkbox" value="HVAC Installation" data-service-option>
      </div>
      <input type="hidden" data-services-value>
      <p data-services-error class="hidden"></p>
    </div>
  </form></body></html>`);

  let active: Element | null = null;
  Object.defineProperty(document, "activeElement", { get: () => active, configurable: true });
  for (const el of document.querySelectorAll("button, input")) {
    (el as HTMLElement).focus = () => {
      active = el;
    };
  }
  Object.assign(globalThis, { document, window, Event: window.Event });

  const root = document.getElementById("root") as unknown as HTMLElement;
  const errors: boolean[] = [];
  const control = initServiceMultiSelect(root, { isLocked, onErrorChange: (e) => errors.push(e) });
  assert.ok(control);
  const q = <T extends Element>(selector: string) => root.querySelector(selector) as unknown as T;
  const trigger = q<HTMLButtonElement>("[data-services-trigger]");
  const panel = q<HTMLElement>("[data-services-panel]");
  const text = q<HTMLElement>("[data-services-trigger-text]");
  const value = q<HTMLInputElement>("[data-services-value]");
  const boxes = Array.from(root.querySelectorAll("[data-service-option]")) as unknown as HTMLInputElement[];

  const press = (target: EventTarget, key: string) => {
    const event = new window.Event("keydown", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "key", { value: key });
    target.dispatchEvent(event);
    return event as Event;
  };
  return { control, trigger, panel, text, value, boxes, press, errors, focused: () => active, window };
};

test("Space on a focused service checkbox toggles it exactly once and prevents the native toggle", () => {
  const { boxes, press, text, value, trigger } = setup();
  press(trigger, "ArrowDown"); // open, focus the first option
  const first = press(boxes[0], " ");
  assert.equal(first.defaultPrevented, true, "without this the browser toggles it back on keyup");
  assert.equal(boxes[0].checked, true);
  assert.equal(text.textContent, "AC Repair");
  assert.equal(value.value, "AC Repair");

  const second = press(boxes[0], " ");
  assert.equal(second.defaultPrevented, true);
  assert.equal(boxes[0].checked, false, "pressing Space again deselects");
  assert.equal(text.textContent, "Select one or more services");
});

test("Enter toggles too, and the summary follows the selection", () => {
  const { boxes, press, text, trigger } = setup();
  press(trigger, "ArrowDown");
  for (const box of boxes) {
    box.focus();
    assert.equal(press(box, "Enter").defaultPrevented, true);
  }
  assert.deepEqual(boxes.map((b) => b.checked), [true, true, true]);
  assert.equal(text.textContent, "3 services selected");
  boxes[2].focus();
  press(boxes[2], "Enter");
  assert.equal(text.textContent, "AC Repair, Heating Repair");
});

test("arrow keys move focus with wrap-around; Escape closes and returns focus to the trigger", () => {
  const { boxes, press, panel, trigger, focused } = setup();
  assert.equal(press(trigger, "ArrowUp").defaultPrevented, true);
  assert.equal(panel.hidden, false);
  assert.equal(focused(), boxes[2], "ArrowUp opens on the last option");
  press(boxes[2], "ArrowDown");
  assert.equal(focused(), boxes[0], "wraps to the first");
  press(boxes[0], "ArrowUp");
  assert.equal(focused(), boxes[2], "wraps to the last");
  assert.equal(press(boxes[2], "Escape").defaultPrevented, true);
  assert.equal(panel.hidden, true);
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  assert.equal(focused(), trigger);
  assert.deepEqual(boxes.map((b) => Boolean(b.checked)), [false, false, false], "moving never selects"); // linkedom: unset is undefined
});

test("the trigger opens and closes with Enter/Space and Escape", () => {
  const { press, panel, trigger } = setup();
  press(trigger, "Enter");
  assert.equal(panel.hidden, false);
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  press(trigger, " ");
  assert.equal(panel.hidden, true);
  press(trigger, " ");
  press(trigger, "Escape");
  assert.equal(panel.hidden, true);
});

test("while locked, keys and clicks change nothing", () => {
  let locked = false;
  const { boxes, press, panel, trigger, window } = setup(() => locked);
  press(trigger, "ArrowDown");
  locked = true;
  const space = press(boxes[0], " ");
  assert.equal(space.defaultPrevented, true, "the native toggle is blocked too");
  assert.equal(Boolean(boxes[0].checked), false);
  const click = new window.Event("click", { bubbles: true, cancelable: true });
  boxes[1].dispatchEvent(click);
  assert.equal(click.defaultPrevented, true, "mouse clicks are cancelled");
  panel.hidden = true;
  trigger.dispatchEvent(new window.Event("click", { bubbles: true }));
  assert.equal(panel.hidden, true, "the list does not open");
});

test("setError shows the message, marks the trigger and calls the form hook", () => {
  const { control, trigger, errors } = setup();
  control.setError(true);
  assert.equal(trigger.getAttribute("aria-invalid"), "true");
  control.setError(false);
  assert.equal(trigger.getAttribute("aria-invalid"), "false");
  assert.deepEqual(errors, [true, false]);
});
