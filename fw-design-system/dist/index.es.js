// src/Avatar.tsx
import React from "react";
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
  return /* @__PURE__ */ React.createElement("div", { className: cls, "aria-label": initials }, initials.slice(0, 2).toUpperCase());
}

// src/Badge.tsx
import React2 from "react";
function Badge({
  variant = "gold",
  children,
  className = ""
}) {
  const cls = `fw-badge fw-badge--${variant}${className ? " " + className : ""}`;
  return /* @__PURE__ */ React2.createElement("span", { className: cls }, children);
}

// src/Button.tsx
import React3 from "react";
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
    return /* @__PURE__ */ React3.createElement("a", { href, className: cls, onClick }, children);
  }
  return /* @__PURE__ */ React3.createElement("button", { type, className: cls, disabled, onClick }, children);
}

// src/Card.tsx
import React4 from "react";
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
  return /* @__PURE__ */ React4.createElement("div", { className: cls, onClick, style: onClick ? { cursor: "pointer" } : void 0 }, children);
}

// src/Chip.tsx
import React5 from "react";
function Chip({
  variant = "cream",
  children,
  className = ""
}) {
  const cls = `fw-chip fw-chip--${variant}${className ? " " + className : ""}`;
  return /* @__PURE__ */ React5.createElement("span", { className: cls }, children);
}

// src/LiveBadge.tsx
import React6 from "react";
function LiveBadge({ label = "Live", className = "" }) {
  return /* @__PURE__ */ React6.createElement("span", { className: `fw-live-badge${className ? " " + className : ""}` }, /* @__PURE__ */ React6.createElement("span", { className: "fw-live-badge__dot", "aria-hidden": "true" }), label);
}

// src/NavBar.tsx
import React7 from "react";
function NavBar({
  logo,
  title = "Faithful Witness",
  subtitle,
  actions,
  showStrip = true,
  className = ""
}) {
  return /* @__PURE__ */ React7.createElement("div", { className: `fw-navbar${className ? " " + className : ""}` }, showStrip && /* @__PURE__ */ React7.createElement("div", { className: "fw-navbar__strip" }), /* @__PURE__ */ React7.createElement("nav", { className: "fw-navbar__bar" }, /* @__PURE__ */ React7.createElement("div", { className: "fw-navbar__logo" }, logo && /* @__PURE__ */ React7.createElement("span", { style: { display: "flex", alignItems: "center" } }, logo), title && /* @__PURE__ */ React7.createElement("div", null, /* @__PURE__ */ React7.createElement("span", { className: "fw-navbar__title" }, title), subtitle && /* @__PURE__ */ React7.createElement("span", { className: "fw-navbar__subtitle" }, subtitle))), actions && /* @__PURE__ */ React7.createElement("div", { className: "fw-navbar__actions" }, actions)));
}

// src/OptionButton.tsx
import React8 from "react";
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
  return /* @__PURE__ */ React8.createElement("button", { type: "button", className: cls, onClick, "aria-pressed": selected }, /* @__PURE__ */ React8.createElement("span", { className: "fw-option-btn__dot", "aria-hidden": "true" }), /* @__PURE__ */ React8.createElement("span", { className: "fw-option-btn__text" }, children));
}

// src/ProgressBar.tsx
import React9 from "react";
function ProgressBar({
  value,
  label,
  showPercentage = false,
  size = "sm",
  className = ""
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const cls = `fw-progress${size !== "sm" ? " fw-progress--" + size : ""}${className ? " " + className : ""}`;
  return /* @__PURE__ */ React9.createElement("div", { className: cls }, /* @__PURE__ */ React9.createElement("div", { className: "fw-progress__track" }, /* @__PURE__ */ React9.createElement("div", { className: "fw-progress__fill", style: { width: `${clamped}%` } })), (label || showPercentage) && /* @__PURE__ */ React9.createElement("div", { className: "fw-progress__meta" }, label && /* @__PURE__ */ React9.createElement("span", null, label), showPercentage && /* @__PURE__ */ React9.createElement("span", null, clamped, "%")));
}

// src/SectionHeader.tsx
import React10 from "react";
function SectionHeader({
  eyebrow,
  eyebrowMuted = false,
  title,
  titleLg = false,
  onDark = false,
  description,
  className = ""
}) {
  return /* @__PURE__ */ React10.createElement("div", { className: `fw-section-header${className ? " " + className : ""}` }, eyebrow && /* @__PURE__ */ React10.createElement("div", { className: `fw-section-header__eyebrow${eyebrowMuted ? " fw-section-header__eyebrow--muted" : ""}` }, eyebrow), /* @__PURE__ */ React10.createElement(
    "div",
    {
      className: [
        "fw-section-header__title",
        titleLg ? "fw-section-header__title--lg" : "",
        onDark ? "fw-section-header__title--white" : ""
      ].filter(Boolean).join(" ")
    },
    title
  ), description && /* @__PURE__ */ React10.createElement("div", { className: `fw-section-header__description${onDark ? " fw-section-header__description--white" : ""}` }, description));
}

// src/StatCard.tsx
import React11 from "react";
function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon,
  className = ""
}) {
  return /* @__PURE__ */ React11.createElement("div", { className: `fw-stat-card${className ? " " + className : ""}` }, icon && /* @__PURE__ */ React11.createElement("div", { style: { marginBottom: "0.5rem", color: "var(--fw-gold)" } }, icon), /* @__PURE__ */ React11.createElement("div", { className: "fw-stat-card__label" }, label), /* @__PURE__ */ React11.createElement("div", { className: "fw-stat-card__value" }, value), change && /* @__PURE__ */ React11.createElement("div", { className: `fw-stat-card__change fw-stat-card__change--${changeType}` }, change));
}

// src/StepIndicator.tsx
import React12 from "react";
function StepIndicator({ steps, className = "" }) {
  return /* @__PURE__ */ React12.createElement(
    "div",
    {
      className: `fw-steps${className ? " " + className : ""}`,
      style: { gridTemplateColumns: `repeat(${steps.length}, 1fr)` }
    },
    steps.map((step) => /* @__PURE__ */ React12.createElement(
      "div",
      {
        key: step.number,
        className: [
          "fw-step",
          step.active ? "fw-step--active" : "",
          step.complete ? "fw-step--complete" : ""
        ].filter(Boolean).join(" ")
      },
      /* @__PURE__ */ React12.createElement("div", { className: "fw-step__number" }, step.number),
      /* @__PURE__ */ React12.createElement("div", { className: "fw-step__name" }, step.name)
    ))
  );
}
export {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  LiveBadge,
  NavBar,
  OptionButton,
  ProgressBar,
  SectionHeader,
  StatCard,
  StepIndicator
};
