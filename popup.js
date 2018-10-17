// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


let rules = [];
let addbutton = document.getElementById('hostsbutton');
let container = document.getElementById('container');

function constructOptions() {
    addbutton.addEventListener('click', () => {
        let from = document.getElementById('host').value;
        let to = document.getElementById('rhost').value;
        if (from && to && from !== to) {
            container.appendChild(createNewTemplate(from, to));

            let obj = {};
            obj[from] = to;
        }
    });
}

function forCreatingPullRequests(){
    return "yes it is work"
}
function updateRules() {
    console.log('update all routes');
    rules =  [];
    getAllRules(_rules => {
        _rules.forEach(rule => {
            container.appendChild(createNewTemplate(rule.pattern, rule.redirectTo, rule.active));
        });
    })
}

function getAllRules(cb) {
    console.log('get all routes');
    chrome.storage.local.get('x-rules', function (res) {
        if (typeof cb === "function") {
            cb(res['x-rules'] || []);
        }
    })
}

function saveRules() {
    chrome.storage.local.set({'x-rules': rules}, (err) => {
        if(err) console.log(err.message);
    })
}

/**
 * for simple creatin new element
 * */
function createNewTemplate(from, to, active = true) {

    let currentId = getNewId();
    addRule({pattern: from, redirectTo: to, active: active, id: currentId});
    let delButton = document.createElement('button');
    delButton.innerHTML = '--';
    delButton.setAttribute('class', 'delete');

    let el = document.createElement('div');
    el.className = 'container';

    let checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.class = 'checkbox';
    checkbox.checked = active;
    checkbox.addEventListener('click', () => {
        changeActivity(currentId);
        saveRules();
    });

    let divfrom = document.createElement('div');
    divfrom.innerHTML = from;
    divfrom.className = 'output';

    let divto = document.createElement('div');
    divto.innerHTML = to;
    divto.className = 'output';

    el.appendChild(divfrom);
    el.appendChild(divto);
    el.appendChild(checkbox);
    el.appendChild(delButton);

    delButton.addEventListener('click', () => {
        el.remove();
        delRule(currentId);
        saveRules();
    });
    saveRules();
    return el;
}

let button = document.getElementById('setProxy');
let proxy_is_set = false;

const ADD_MAIN_TEMPLATE = "function FindProxyForURL( url, host) {\n\t";
const DIRECT_STRING = "else return 'DIRECT'; }";

let _id = 0;

function getNewId() {
    return _id++;
}


function addRule(rule) {
    rules.push(rule);
}

function delRule(id) {
    let index = -1;
    for (let i = 0; i < rules.length; i++) {
        if (rules[i].id === id) {
            index = i;
            break;
        }
    }
    if (~index) {
        rules.splice(index, 1);
        saveRules();
    }
}

function changeActivity(id) {
    for (let i = 0; i < rules.length; i++) {
        if (rules[i].id === id) {
            return rules[i].active = !rules[i].active;
        }
    }
}

function getTemplateOfMiddleString(pattern, redirectTo) {
    return "\n\tif(shExpMatch( url,'" + pattern + "')){\n\t\t return 'PROXY " + redirectTo + "';\n\t}\n"
}

/**
 * Get PAC script string
 * @param {{pattern: String, redirectTo: String, active: boolean}[]} Rules
 * @return {string}
 */
function getPacScript(Rules) {
    let script = "";
    script += ADD_MAIN_TEMPLATE;

    rules.forEach(rule => {
        if (rule.active)
            script += getTemplateOfMiddleString(rule.pattern, rule.redirectTo);
    });

    return script += DIRECT_STRING;
}

function checkActivity(cb) {
    chrome.proxy.settings.get({incognito: false}, cb);
}

function setup() {

    checkActivity(mode => {
        button.innerHTML = mode.value.mode === "system" ? 'On proxy' : 'Off proxy';
    });

    button.addEventListener('click', () => {
        proxy_is_set = checkActivity(settings => {
            proxy_is_set = settings.value.mode !== "system";
            if (!proxy_is_set) {
                let config = {
                    mode: "pac_script",
                    pacScript: {
                        data: getPacScript(rules),
                        mandatory: true
                    }
                };
                chrome.proxy.settings.set({value: config, scope: 'regular'}, (err) => {
                    checkActivity((sets) => {
                        button.innerHTML = sets.value.mode === "system" ? 'On proxy' : 'Off proxy';
                    });
                });
            } else {
                chrome.proxy.settings.clear({scope: 'regular'}, () => {
                    checkActivity((sets) => {
                        button.innerHTML = sets.value.mode === "system" ? 'On proxy' : 'Off proxy';
                    });
                });
            }
        });
    });

}

constructOptions();
setup();
updateRules();