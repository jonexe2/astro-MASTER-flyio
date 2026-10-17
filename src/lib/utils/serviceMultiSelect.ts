// Shared HVAC service multi-select used by both lead forms (hero and contact).
// Browser-only. Each form keeps its own markup and classes; this module only
// needs these data hooks inside `root`:
//   [data-services-trigger]       button that opens the list
//   [data-services-trigger-text]  summary text, with data-placeholder
//   [data-services-panel]         the list (hidden attribute when closed)
//   [data-service-option]         one checkbox per service (value = label)
//   [data-services-error]         "select at least one" message (optional)
//   [data-services-value]         hidden input mirroring the selection (optional)

export interface ServiceMultiSelect {
  selected(): string[]; // checked labels, in on-screen order
  setError(hasError: boolean): void;
  close(): void;
  focusTrigger(): void;
  sync(): void; // refresh summary and hidden value (after a reset)
}

interface Options {
  isLocked?: () => boolean; // true while a request is pending: no changes allowed
  onErrorChange?: (hasError: boolean) => void; // form-specific error styling
  onChange?: (selected: string[]) => void; // form-specific "filled" styling
}

export const initServiceMultiSelect = (
  root: HTMLElement,
  { isLocked = () => false, onErrorChange, onChange }: Options = {},
): ServiceMultiSelect | null => {
  const trigger = root.querySelector<HTMLButtonElement>("[data-services-trigger]");
  const triggerText = root.querySelector<HTMLElement>("[data-services-trigger-text]");
  const panel = root.querySelector<HTMLElement>("[data-services-panel]");
  const error = root.querySelector<HTMLElement>("[data-services-error]");
  const value = root.querySelector<HTMLInputElement>("[data-services-value]");
  const checkboxes = Array.from(root.querySelectorAll<HTMLInputElement>("[data-service-option]"));
  if (!trigger || !triggerText || !panel || checkboxes.length === 0) return null;

  const setOpen = (open: boolean, focusOption = false) => {
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    if (open && focusOption) checkboxes[0]?.focus();
  };

  const selected = () => checkboxes.filter((checkbox) => checkbox.checked).map(({ value }) => value);

  const setError = (hasError: boolean) => {
    error?.classList.toggle("hidden", !hasError);
    trigger.setAttribute("aria-invalid", String(hasError));
    onErrorChange?.(hasError);
  };

  const sync = () => {
    const list = selected();
    if (value) value.value = list.join(", ");
    if (list.length === 0) {
      triggerText.textContent = triggerText.dataset.placeholder || "Select one or more services";
    } else if (list.length <= 2) {
      triggerText.textContent = list.join(", ");
    } else {
      triggerText.textContent = `${list.length} services selected`;
    }
    if (list.length > 0) setError(false);
    onChange?.(list);
  };

  trigger.addEventListener("click", () => {
    if (isLocked()) return;
    setOpen(panel.hasAttribute("hidden"));
  });

  trigger.addEventListener("keydown", (event) => {
    if (isLocked() && event.key !== "Tab") {
      event.preventDefault();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(panel.hasAttribute("hidden"));
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true, true);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      checkboxes.at(-1)?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  });

  panel.addEventListener("keydown", (event) => {
    const currentIndex = checkboxes.indexOf(document.activeElement as HTMLInputElement);
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      trigger.focus();
    } else if ((event.key === "Enter" || event.key === " ") && currentIndex >= 0) {
      // Required: without it the browser's own Space action toggles the box
      // back on keyup (covered by serviceMultiSelect.test.ts).
      event.preventDefault();
      if (isLocked()) return;
      const checkbox = checkboxes[currentIndex];
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (event.key === "ArrowDown" && currentIndex >= 0) {
      event.preventDefault();
      checkboxes[(currentIndex + 1) % checkboxes.length]?.focus();
    } else if (event.key === "ArrowUp" && currentIndex >= 0) {
      event.preventDefault();
      checkboxes[(currentIndex - 1 + checkboxes.length) % checkboxes.length]?.focus();
    }
  });

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", sync);
    // Ignore service changes while a request is pending.
    checkbox.addEventListener("click", (event) => {
      if (isLocked()) event.preventDefault();
    });
  });

  document.addEventListener("pointerdown", (event) => {
    if (!root.contains(event.target as Node)) setOpen(false);
  });

  root.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (!root.contains(document.activeElement)) setOpen(false);
    }, 0);
  });

  sync();

  return {
    selected,
    setError,
    close: () => setOpen(false),
    focusTrigger: () => trigger.focus(),
    sync,
  };
};
