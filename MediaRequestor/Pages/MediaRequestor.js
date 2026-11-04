define([
],
    function () {
        'use strict';
        let isPanelLoaded = false;
        let modifiedStyles = {};
        const baseVariableNames = new Map();

        function isColorVariableName(variableName) {
            var hasBK = variableName.includes('-background') && !variableName.includes("-position");
            var hasClr = variableName.includes('-color');
            var hasBlur = variableName.includes('-blur');
            var hasAccent = variableName.includes('-accent');

            return hasBK || hasClr || hasBlur || hasAccent;
        }

        function isValidColorValue(value) {
            if (!value || value === '<undefined>') {
                return false;
            }
            const option = new Option();
            option.style.color = value;
            return option.style.color !== '';
        }

        function isValidColorVariable(variableName) {
            const value = getEmbyColorValue(variableName);
            if (value == "<undefined>") {
                return true;
            }

            return isValidColorValue(value);
        }

        function getEmbyColorValue(variableName) {
            const computedStyles = window.getComputedStyle(document.body);

            let value = computedStyles.getPropertyValue(variableName).trim();
            if (value) {
                return value;
            }

            let h = computedStyles.getPropertyValue(`${variableName}-hue`).trim();
            let s = computedStyles.getPropertyValue(`${variableName}-saturation`).trim();
            let l = computedStyles.getPropertyValue(`${variableName}-lightness`).trim();
            let a = computedStyles.getPropertyValue(`${variableName}-alpha`).trim();
            if (variableName == "--button-background-blur") {
                h = computedStyles.getPropertyValue(`--button-background-hue`).trim();
                s = computedStyles.getPropertyValue(`--button-background-saturation`).trim();
            }
            else if (variableName == "--focus-text-color") {
                h = computedStyles.getPropertyValue(`--theme-text-color-hue`).trim();
                s = computedStyles.getPropertyValue(`--theme-text-color-saturation`).trim();
                l = computedStyles.getPropertyValue(`--focus-text-color-lightness`).trim();
                a = computedStyles.getPropertyValue(`--theme-text-color-alpha`).trim();
            }
            else if (variableName == "--theme-secondary-text-color") {
                h = computedStyles.getPropertyValue(`--theme-text-color-hue`).trim();
                s = computedStyles.getPropertyValue(`--theme-text-color-saturation`).trim();
                l = computedStyles.getPropertyValue(`--theme-text-color-lightness`).trim();
                a = computedStyles.getPropertyValue(`--theme-secondary-text-color-alpha`).trim();
            }

            if (s && !s.includes('%')) {
                s = `${s}%`;
            }

            if (l && !l.includes('%')) {
                l = `${l}%`;
            }

            if (!a && variableName.endsWith("-lightened")) {
                a = "60%";
            }

            if (h && s && l && a) {
                return `hsla(${h}, ${s}, ${l}, ${a})`;
            }

            if (h && s && l && !a) {
                return `hsl(${h}, ${s}, ${l})`;
            }

            return "<undefined>";
        }

        const kBLACK = { hex: '#000000', alpha: 1, h: 0, s: 0, l: 0, r: 0x00, g: 0x00, b: 0x00 }; // black
        const kDARK_GREY = { hex: '#808080', alpha: 1, h: 0, s: 0, l: 0.50, r: 0x80, g: 0x80, b: 0x80 }; // dark grey

        function rgbToHex(r, g, b) {
            const toHex = (component) => {
                const clamped = Math.max(0, Math.min(255, component));
                return clamped.toString(16).padStart(2, '0');
            };

            return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
        }

        function rgbToHSL(r, g, b) {
            let rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
            let max = Math.max(rNorm, gNorm, bNorm);
            let min = Math.min(rNorm, gNorm, bNorm);

            let h, s, l = (max + min) / 2;

            if (max === min) {
                h = s = 0;
            } else {
                let d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
                    case gNorm: h = (bNorm - rNorm) / d + 2; break;
                    case bNorm: h = (rNorm - gNorm) / d + 4; break;
                }
                h /= 6;
            }

            return {
                h: Math.round(h * 360),
                s: Math.round(s * 100),
                l: Math.round(l * 100)
            };
        }

        function finalizeComponentColors(rgbComponentColors) {

            let retVal = rgbComponentColors;

            retVal.hex = rgbToHex(retVal.r, retVal.g, retVal.b);
            const hslValues = rgbToHSL(retVal.r, retVal.g, retVal.b);
            retVal.h = hslValues.h;
            retVal.s = hslValues.s;
            retVal.l = hslValues.l;

            return retVal;
        }

        function rgbOptionValueToComponents(colorStr, alphaValue) {
            colorStr = colorStr.trim(); // get rid of leading and trailing spaces

            if (colorStr.startsWith('rgb(')) {
                colorStr = colorStr.slice(3);
            } else if (colorStr.startsWith('rgba(')) {
                colorStr = colorStr.slice(4);
            } else {
                return kDARK_GREY;
            }

            // get rid of parens
            colorStr = colorStr.replace(/[()]/g, '').trim();

            // should be of the form HH(, )+SS(, )+LL(, )
            const split = colorStr.split(/[\s,]+/);

            if (split.length != 3 && split.length != 4)
                return kDARK_GREY;

            let retVal = kDARK_GREY;
            retVal.r = parseInt(split[0], 10);
            retVal.g = parseInt(split[1], 10);
            retVal.b = parseInt(split[2], 10);
            if (split.length == 4) {
                retVal.alpha = parseFloat(split[3]);
            } else {
                retVal.alpha = alphaValue;
            }

            retVal = finalizeComponentColors(retVal);
            return retVal;
        }


        // handles #RRGGBB[AA] - alpha optional all are 8 bit hex values
        // rgb[a]( rrr, ggg, bbb[, aaa] )  rrr, ggg, bbb are decimal values aaa is float from 0 to 1
        // hsl[a]( hhh, ss.s%, ll.l%[, aaa] ), hhh is integer 0-360, ss.s float 0-100%, ll float 0-100%, 0 -> 1 float

        // returns { hex: '#RRGGBB', alpha: alphaValue, h: hvalue, s:svalue, l:lvalue, r:rvalue, g:gvalue, b:bvalue }
        function colorToComponents(colorStr, alphaValue) {  // may return rgb or rgba
            if (!alphaValue || alphaValue == '') {
                alphaValue = 1;
            }

            if (!colorStr || colorStr === '<undefined>' || colorStr.includes('declared')) {
                return kDARK_GREY;
            }

            // convert the rgb(), rgba(), hsl(), hsla() to rgb[a]
            const option = new Option();
            option.style.color = colorStr;
            const resolvedColor = option.style.color; // Returns "rgb(r, g, b)" or "rgba(r, g, b, a)"
            if (!resolvedColor || resolvedColor === '') {
                return kDARK_GREY;
            }

            return rgbOptionValueToComponents(resolvedColor, alphaValue);
        }

        function addAlphaToHex(hexValue, alphaValue) {
            const alphaHex = Math.round(alphaValue * 255).toString(16).padStart(2, "0").toUpperCase();
            return `${hexValue}${alphaHex}`;
        }

        function setupColorPicker(view, swatchCard, variableName, value) {
            const parsedColor = colorToComponents(value);

            const pickerInput = document.createElement("input");
            pickerInput.type = "color";
            pickerInput.value = parsedColor.hex;
            pickerInput.setAttribute("data-role-alpha", parsedColor.alpha);
            pickerInput.style.cssText = "opacity: 0; width: 100%; height: 100%; cursor: pointer; padding: 0; border: none;";

            pickerInput.addEventListener("input", function (e) {
                let hexValue = e.target.value.toUpperCase();
                hexValue = addAlphaToHex(hexValue, e.currentTarget.getAttribute("data-role-alpha"));

                if (!baseVariableNames.has(variableName)) {
                    modifiedStyles[variableName] = hexValue;
                } else {
                    let hslaValue = colorToComponents(hexValue); // already has alpha
                    const subVariables = baseVariableNames.get(variableName);

                    subVariables.forEach(subVar => {
                        if (subVar.endsWith("-hue")) {
                            modifiedStyles[subVar] = hslaValue.h;
                        }
                        else if (subVar.endsWith("-saturation")) {
                            modifiedStyles[subVar] = `${hslaValue.s}%`;
                        }
                        else if (subVar.endsWith("-lightness")) {
                            modifiedStyles[subVar] = `${hslaValue.l}%`;
                        }
                        else if (subVar.endsWith("-alpha")) {
                            modifiedStyles[subVar] = hslaValue.alpha;
                        }
                    });
                }

                updateCSSOutputPanel(view);

                const localColorBlock = swatchCard.querySelector(".towel42-media-requestor-colorblock");
                if (localColorBlock) {
                    localColorBlock.style.backgroundColor = hexValue;
                }

                const valueDisplayLabel = swatchCard.querySelector(".towel42-media-requestor-value");
                if (valueDisplayLabel) {
                    valueDisplayLabel.textContent = hexValue;
                }
            });

            return pickerInput;
        }

        function getSwatchCard(view, variableName, value, isColor) {
            const swatchCard = document.createElement("div");
            swatchCard.classList.add("towel42-media-requestor-swatch");

            const layoutBlock = document.createElement("div");
            layoutBlock.classList.add("towel42-media-requestor-layoutblock");

            const isUndefinedValue = (value === "<undefined>" || !value);

            if (isColor) {
                const colorBlock = document.createElement("div");

                if (!isUndefinedValue) {
                    colorBlock.style.backgroundColor = `var(${variableName},${value})`;
                }

                colorBlock.classList.add("towel42-media-requestor-colorblock");

                const pickerInput = setupColorPicker(view, swatchCard, variableName, value);
                colorBlock.appendChild(pickerInput);
                layoutBlock.appendChild(colorBlock);
            }

            const nameValueSpan = document.createElement("code");
            nameValueSpan.classList.add("towel42-media-requestor-namevalueblock");

            const nameSpan = document.createElement("span");
            nameSpan.classList.add("towel42-media-requestor-name");
            nameSpan.textContent = variableName;
            nameSpan.title = variableName;

            const colonSpan = document.createElement("span");
            colonSpan.classList.add("towel42-media-requestor-name");
            colonSpan.textContent = ": ";

            nameValueSpan.appendChild(nameSpan);
            nameValueSpan.appendChild(colonSpan);

            if (isColor) {
                const valueSpan = document.createElement("span");
                valueSpan.classList.add("towel42-media-requestor-value");
                valueSpan.textContent = value;

                nameValueSpan.appendChild(valueSpan);
            } else {
                const valueInput = document.createElement("input");
                valueInput.type = "text";
                valueInput.classList.add("towel42-media-requestor-input");
                valueInput.value = value === "<undefined>" ? "" : value;
                valueInput.placeholder = "undefined";

                valueInput.addEventListener("input", function (e) {
                    const newValue = e.target.value.trim();
                    modifiedStyles[variableName] = newValue;
                    updateCSSOutputPanel(view);
                });

                nameValueSpan.appendChild(valueInput);
            }

            layoutBlock.appendChild(nameValueSpan);
            swatchCard.appendChild(layoutBlock);

            return swatchCard;
        }

        function stripSuffixFromList(str, suffixes) {
            for (const suffix of suffixes) {
                if (str.endsWith(suffix)) {
                    return str.slice(0, -suffix.length);
                }
            }
            return str;
        }

        function getAllCSSVariables() {
            let variables = [];
            for (const sheet of document.styleSheets) {
                try {
                    if (!sheet.cssRules) {
                        continue;
                    }

                    for (const rule of sheet.cssRules) {
                        if (rule.style) {
                            for (let i = 0; i < rule.style.length; i++) {
                                let propName = rule.style[i];
                                let basePropName = stripSuffixFromList(propName, ["-hue", "-saturation", "-lightness", "-alpha"]);
                                if (basePropName != propName) {
                                    if (!baseVariableNames.has(basePropName)) {
                                        baseVariableNames.set(basePropName, []);
                                    }

                                    baseVariableNames.get(basePropName).push(propName);
                                }
                                variables.push(basePropName);
                            }
                        }
                    }
                } catch (e) {
                    // Catch cross-origin security flags quietly
                }
            }
            variables = [...new Set(variables)];
            return variables;
        }

        function initCSSVariables() {
            const windowStyles = window.getComputedStyle(document.documentElement);
            var variables = getAllCSSVariables();

            const checkProp = windowStyles.getPropertyValue('--theme-primary-color') || windowStyles.getPropertyValue('--background-hue');
            if (!checkProp && variables.length > 0) {
                requestAnimationFrame(initCSSVariables);
            }
        }

        function getAllStyleVariables() {
            initCSSVariables();
            var variables = getAllCSSVariables();
            variables.sort((lhs, rhs) => {
                const cleanLHS = lhs.replace(/[^a-zA-Z0-9]+/, '').toLowerCase();
                const cleanRHS = rhs.replace(/[^a-zA-Z0-9]+/, '').toLowerCase();
                return cleanLHS.localeCompare(cleanRHS);
            });

            return variables;
        }
        function updateCSSOutputPanel(view) {
            const textarea = view.querySelector("#generatedCSS");
            if (!textarea) {
                return;
            }
            let cssRuleset = ":root, body {\n";
            let hasRules = false;
            for (const [property, value] of Object.entries(modifiedStyles)) {
                if (value !== null && value !== "") {
                    cssRuleset += `    ${property}: ${value}; \n`;
                    hasRules = true;
                }
            }
            cssRuleset += "}";
            if (hasRules) {
                textarea.value = cssRuleset;
            } else {
                textarea.value = "/* Modify any property input variables above to generate a custom CSS theme script */";
            }
        }

        function loadColorPanel(view, params) {
            if (isPanelLoaded) {
                return;
            }
            const colorContainer = view.querySelector("#colorGrid");
            const variableContainer = view.querySelector("#variableGrid");

            if (colorContainer && variableContainer) {
                const variables = getAllStyleVariables();

                variables.forEach(variableName => {
                    var value = getEmbyColorValue(variableName);
                    var isColor = isColorVariableName(variableName) || isValidColorValue(value);

                    const swatchCard = getSwatchCard(view, variableName, value, isColor);

                    if (isColor) {
                        colorContainer.appendChild(swatchCard);
                    }
                    else {
                        variableContainer.appendChild(swatchCard);
                    }
                });

                isPanelLoaded = true;
            }
        }

        const STYLE_ID = 'media-requestor-stylesheet';
        function injectStyleSheet() {
            if (document.getElementById(STYLE_ID)) {
                return;
            }
            const cssUrl = 'configurationpage?name=media-requestor-style.css';
            const link = document.createElement('link');
            link.id = STYLE_ID;
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = cssUrl;

            document.head.appendChild(link);
        }

        const RUNTIME_THEME_OVERRIDE_ID = "towel42-media-requestor-runtime-style";
        function bindCustomCSSEvents(view) {
            const applyBtn = view.querySelector("#btnApplyCustomCSS");
            const textarea = view.querySelector("#generatedCSS");
            if (applyBtn && textarea) {
                applyBtn.addEventListener("click", function () {
                    let runtimeOverrideStyle = document.getElementById(RUNTIME_THEME_OVERRIDE_ID);
                    if (!runtimeOverrideStyle) {
                        runtimeOverrideStyle = document.createElement("style");
                        runtimeOverrideStyle.id = RUNTIME_THEME_OVERRIDE_ID;
                        document.head.appendChild(runtimeOverrideStyle);
                    }

                    const textarea = view.querySelector("#generatedCSS");
                    const newCss = textarea.value;

                    runtimeOverrideStyle.textContent = newCss;

                    ApiClient.getServerConfiguration().then(function (config) {
                        var payload = {
                            LoginDisclaimer: "",
                            CustomCss: ""
                        };

                        if (config.Branding) {
                            payload.LoginDisclaimer = config.Branding.LoginDisclaimer;
                            payload.CustomCss = config.Branding.CustomCss;
                        }

                        payload.CustomCss = newCss;

                        ApiClient.ajax({
                            type: "POST",
                            url: ApiClient.getUrl("System/Configuration/Branding"),
                            data: JSON.stringify(payload),
                            contentType: "application/json"
                        }).then(function () {
                            console.log("Theme configuration saved successfully!");

                            if (window.Dashboard) {
                                Dashboard.alert({
                                    message: "Theme applied successfully!"
                                });
                            }
                        }).catch(function (error) {
                            console.error("Failed to update the theme configuration:", error);
                        });
                    });
                });
            }
        }

        return function (view, params) {
            view.addEventListener('viewshow', () => {
                injectStyleSheet();
                loadColorPanel(view, params);
                bindCustomCSSEvents(view);
                updateCSSOutputPanel(view);
            });

            view.addEventListener('viewhide', function (e) {
            });

            view.addEventListener('viewdestroy', function (e) {
                isPanelLoaded = false;
                modifiedStyles = {};
                baseVariableNames.clear();
            });
        };
    }
);

