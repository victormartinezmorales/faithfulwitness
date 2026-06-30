"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Avatar: () => Avatar,
  Badge: () => Badge,
  Button: () => Button,
  Card: () => Card,
  Chip: () => Chip,
  LiveBadge: () => LiveBadge,
  NavBar: () => NavBar,
  OptionButton: () => OptionButton,
  ProgressBar: () => ProgressBar,
  SectionHeader: () => SectionHeader,
  StatCard: () => StatCard,
  StepIndicator: () => StepIndicator
});
module.exports = __toCommonJS(index_exports);

// src/Avatar.tsx
var import_react = __toESM(require("react"));
function Avatar({
  initials,
  size = "md",
  color = "navy",
  className = ""
}) {
  const cls = [
    "fw-avatar",
    `fw-avatar--${size}`,
    color !== "navy" ? `fw-avatar--${color}` : "",
    className
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ import_react.default.createElement("div", { className: cls, "aria-label": initials }, initials.slice(0, 2).toUpperCase());
}

// src/Badge.tsx
var import_react2 = __toESM(require("react"));
function Badge({
  variant = "gold",
  children,
  className = ""
}) {
  const cls = `fw-badge fw-badge--${variant}${className ? " " + className : ""}`;
  return /* @__PURE__ */ import_react2.default.createElement("span", { className: cls }, children);
}

// src/Button.tsx
var import_react3 = __toESM(require("react"));
function Button({
  variant = "primary",
  size = "md",
  children,
  disabled = false,
  onClick,
  type = "button",
  href,
  className = ""
}) {
  const cls = `fw-btn fw-btn--${variant} fw-btn--${size}${className ? " " + className : ""}`;
  if (href) {
    return /* @__PURE__ */ import_react3.default.createElement("a", { href, className: cls, onClick }, children);
  }
  return /* @__PURE__ */ import_react3.default.createElement("button", { type, className: cls, disabled, onClick }, children);
}

// src/Card.tsx
var import_react4 = __toESM(require("react"));
function Card({
  accent = false,
  navyAccent = false,
  padding = "md",
  flat = false,
  children,
  className = "",
  onClick
}) {
  const cls = [
    "fw-card",
    `fw-card--${padding}`,
    accent ? "fw-card--accent" : "",
    navyAccent ? "fw-card--navy-accent" : "",
    flat ? "fw-card--flat" : "",
    className
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: cls, onClick, style: onClick ? { cursor: "pointer" } : void 0 }, children);
}

// src/Chip.tsx
var import_react5 = __toESM(require("react"));
function Chip({
  variant = "cream",
  children,
  className = ""
}) {
  const cls = `fw-chip fw-chip--${variant}${className ? " " + className : ""}`;
  return /* @__PURE__ */ import_react5.default.createElement("span", { className: cls }, children);
}

// src/LiveBadge.tsx
var import_react6 = __toESM(require("react"));
function LiveBadge({ label = "Live", className = "" }) {
  return /* @__PURE__ */ import_react6.default.createElement("span", { className: `fw-live-badge${className ? " " + className : ""}` }, /* @__PURE__ */ import_react6.default.createElement("span", { className: "fw-live-badge__dot", "aria-hidden": "true" }), label);
}

// src/NavBar.tsx
var import_react7 = __toESM(require("react"));
function NavBar({
  logo,
  title = "Faithful Witness",
  subtitle,
  actions,
  showStrip = true,
  className = ""
}) {
  return /* @__PURE__ */ import_react7.default.createElement("div", { className: `fw-navbar${className ? " " + className : ""}` }, showStrip && /* @__PURE__ */ import_react7.default.createElement("div", { className: "fw-navbar__strip" }), /* @__PURE__ */ import_react7.default.createElement("nav", { className: "fw-navbar__bar" }, /* @__PURE__ */ import_react7.default.createElement("div", { className: "fw-navbar__logo" }, logo && /* @__PURE__ */ import_react7.default.createElement("span", { style: { display: "flex", alignItems: "center" } }, logo), title && /* @__PURE__ */ import_react7.default.createElement("div", null, /* @__PURE__ */ import_react7.default.createElement("span", { className: "fw-navbar__title" }, title), subtitle && /* @__PURE__ */ import_react7.default.createElement("span", { className: "fw-navbar__subtitle" }, subtitle))), actions && /* @__PURE__ */ import_react7.default.createElement("div", { className: "fw-navbar__actions" }, actions)));
}

// src/OptionButton.tsx
var import_react8 = __toESM(require("react"));
function OptionButton({
  selected = false,
  children,
  onClick,
  className = ""
}) {
  const cls = [
    "fw-option-btn",
    selected ? "fw-option-btn--selected" : "",
    className
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ import_react8.default.createElement("button", { type: "button", className: cls, onClick, "aria-pressed": selected }, /* @__PURE__ */ import_react8.default.createElement("span", { className: "fw-option-btn__dot", "aria-hidden": "true" }), /* @__PURE__ */ import_react8.default.createElement("span", { className: "fw-option-btn__text" }, children));
}

// src/ProgressBar.tsx
var import_react9 = __toESM(require("react"));
function ProgressBar({
  value,
  label,
  showPercentage = false,
  size = "sm",
  className = ""
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const cls = `fw-progress${size !== "sm" ? " fw-progress--" + size : ""}${className ? " " + className : ""}`;
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: cls }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fw-progress__track" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fw-progress__fill", style: { width: `${clamped}%` } })), (label || showPercentage) && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fw-progress__meta" }, label && /* @__PURE__ */ import_react9.default.createElement("span", null, label), showPercentage && /* @__PURE__ */ import_react9.default.createElement("span", null, clamped, "%")));
}

// src/SectionHeader.tsx
var import_react10 = __toESM(require("react"));
function SectionHeader({
  eyebrow,
  eyebrowMuted = false,
  title,
  titleLg = false,
  onDark = false,
  description,
  className = ""
}) {
  return /* @__PURE__ */ import_react10.default.createElement("div", { className: `fw-section-header${className ? " " + className : ""}` }, eyebrow && /* @__PURE__ */ import_react10.default.createElement("div", { className: `fw-section-header__eyebrow${eyebrowMuted ? " fw-section-header__eyebrow--muted" : ""}` }, eyebrow), /* @__PURE__ */ import_react10.default.createElement(
    "div",
    {
      className: [
        "fw-section-header__title",
        titleLg ? "fw-section-header__title--lg" : "",
        onDark ? "fw-section-header__title--white" : ""
      ].filter(Boolean).join(" ")
    },
    title
  ), description && /* @__PURE__ */ import_react10.default.createElement("div", { className: `fw-section-header__description${onDark ? " fw-section-header__description--white" : ""}` }, description));
}

// src/StatCard.tsx
var import_react11 = __toESM(require("react"));
function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon,
  className = ""
}) {
  return /* @__PURE__ */ import_react11.default.createElement("div", { className: `fw-stat-card${className ? " " + className : ""}` }, icon && /* @__PURE__ */ import_react11.default.createElement("div", { style: { marginBottom: "0.5rem", color: "var(--fw-gold)" } }, icon), /* @__PURE__ */ import_react11.default.createElement("div", { className: "fw-stat-card__label" }, label), /* @__PURE__ */ import_react11.default.createElement("div", { className: "fw-stat-card__value" }, value), change && /* @__PURE__ */ import_react11.default.createElement("div", { className: `fw-stat-card__change fw-stat-card__change--${changeType}` }, change));
}

// src/StepIndicator.tsx
var import_react12 = __toESM(require("react"));
function StepIndicator({ steps, className = "" }) {
  return /* @__PURE__ */ import_react12.default.createElement(
    "div",
    {
      className: `fw-steps${className ? " " + className : ""}`,
      style: { gridTemplateColumns: `repeat(${steps.length}, 1fr)` }
    },
    steps.map((step) => /* @__PURE__ */ import_react12.default.createElement(
      "div",
      {
        key: step.number,
        className: [
          "fw-step",
          step.active ? "fw-step--active" : "",
          step.complete ? "fw-step--complete" : ""
        ].filter(Boolean).join(" ")
      },
      /* @__PURE__ */ import_react12.default.createElement("div", { className: "fw-step__number" }, step.number),
      /* @__PURE__ */ import_react12.default.createElement("div", { className: "fw-step__name" }, step.name)
    ))
  );
}
