class SubSystemForm extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

    static DEFAULT_OPTIONS = {
        tag: "form",
        id: `${moduleName}-configure`,
        classes: [moduleName],
        window: {title: "Subsystems Config", resizable: true},
        position: {width: 500},
        actions: {},
        form: {
            handler: this.formHandler,
            closeOnSubmit: false,
            submitOnChange: false,
        },
    };

    static PARTS = {
        main: {
            template: "modules/pf2e-party-sheet-helper/templates/sub-systems.hbs",
            root: true,
        },
    };

    subsystemData = undefined;
    dropListValue = undefined;

    constructor(options) {
        super({});
        this.actor = options.actor;
        this.dropListValue = 'reputation'
        this.subsystemData = this.getSubsystemData(this.dropListValue)
    }

    async _prepareContext() {
        return {
            rows: this.subsystemData,
            dropListValue: this.dropListValue,
            pregenVisibility: !["reputation", "infiltration", "research", "chases"].includes(this.dropListValue) ? 'hidden' : 'visible',
            addVisibility: !["reputation", "victory-points", "influence"].includes(this.dropListValue) ? 'hidden' : 'visible',
        };
    }

    getSubsystemData(name) {
        let _obj = (this.actor.getFlag(moduleName, "subsystems") ?? {})?.[name] ?? {};

        return JSON.parse(JSON.stringify(_obj));
    }

    async saveSubsystemData(obj) {
        const subsystems = JSON.parse(JSON.stringify(this.actor.getFlag(moduleName, "subsystems") ?? {}));
        subsystems[this.dropListValue] = obj;
        if (Object.keys(obj).length === 0) {
            delete subsystems[this.dropListValue]
        }
        await this.actor.unsetFlag(moduleName, "subsystems");
        await this.actor.setFlag(moduleName, "subsystems", subsystems);
        this.subsystemData = this.getSubsystemData(this.dropListValue)
    }

    static async formHandler(_event, _form, formData) {
        const data = {
            "row-name": formData.object["row-name"] ? [formData.object["row-name"]].flat() : [],
            "row-value": formData.object["row-value"] ? [formData.object["row-value"]].flat().map((value) => Number(value)) : [],
        };
        const obj = {};
        if (data['row-name']) {
            let names = typeof data['row-name'] === 'string' ? [data['row-name']] : data['row-name'];
            let values = typeof data['row-value'] === 'number' ? [data['row-value']] : data['row-value'];

            names.forEach((element, index) => {
                obj[element] = values[index];
            });
        }
        await this.saveSubsystemData(obj);
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        const root = this.element;

        root.querySelector('a.create-pregen')?.addEventListener("click", async () => {
            const sub = root.querySelector('.drop-list')?.value;
            if ("infiltration" === sub) {
                this.subsystemData["Infiltration Points"] ??= 0;
                this.subsystemData["Awareness Points"] ??= 0;
                this.subsystemData["Edge Points"] ??= 0;

                this.render(true);
            } else if ("research" === sub) {
                this.subsystemData["Research Points"] ??= 0;

                this.render(true);
            } else if ("chases" === sub) {
                this.actor.members.filter(a => !a?.isOfType("familiar")).filter(a => !["eidolon", 'animal-companion'].includes(a.class?.slug))
                    .forEach((element, index) => {
                        this.subsystemData[element.name] ??= 0;
                    });

                this.render(true);
            } else if ("reputation" === sub) {
                const result = await foundry.applications.api.DialogV2.wait({
                    window: {title: "Choose Adventure"},
                    content: `
                        <h3>Adventures</h3>
                            <select id="map">
                            <option value=0>Blood Lords</option>
                            <option value=1>Seven Dooms for Sandpoint</option>
                            <option value=2>Season of Ghosts</option>
                            <option value=3>Sky Kings Tomb</option>
                        </select><hr>
                    `,
                    rejectClose: false,
                    buttons: [{
                        action: "ok",
                        label: "Choose",
                        icon: "fa-solid fa-hand-fist",
                        default: true,
                        callback: (_event, button) => {
                            return {map: parseInt(button.form.elements.map.value)};
                        }
                    }, {
                        action: "cancel",
                        label: "Cancel",
                        icon: "fa-solid fa-ban",
                    }]
                });
                const map = result?.map;
                if (map === undefined) {
                    return;
                }

                if (map === 0) {
                    this.subsystemData["Builders League"] ??= 0;
                    this.subsystemData["Celebrants"] ??= 0;
                    this.subsystemData["Export Guild"] ??= 0;
                    this.subsystemData["Reanimators"] ??= 0;
                    this.subsystemData["Tax Collectors Union"] ??= 0;

                    this.render(true);
                } else if (map === 1) {
                    this.subsystemData["Bunyip Club"] ??= 0;
                    this.subsystemData["Runewatchers"] ??= 0;
                    this.subsystemData["Sandpoint Cathedral"] ??= 0;
                    this.subsystemData["Sandpoint Mercantile League"] ??= 0;
                    this.subsystemData["Scarnetti Consortium"] ??= 0;
                    this.subsystemData["Town Watch"] ??= 0;
                    this.subsystemData["Townsfolk"] ??= 0;

                    this.render(true);
                } else if (map === 2) {
                    this.subsystemData["Northridge"] ??= 0;
                    this.subsystemData["Southbank"] ??= 0;

                    this.render(true);
                } else if (map === 3) {
                    this.subsystemData["Highhelm"] ??= 0;

                    this.render(true);
                }
            } else {
                ui.notifications.info("Not implemented yet");
                return
            }
        });

        root.querySelectorAll('a.remove-subsystem-row').forEach((button) => {
            button.addEventListener("click", async (event) => {
                const a = $(event.currentTarget).closest('.package-overview').find('[name="row-name"]').val();
                delete this.subsystemData[a];
                this.render(true);
            });
        });

        root.querySelector('a.create-subsystem-row')?.addEventListener("click", async () => {
            const result = await foundry.applications.api.DialogV2.wait({
                window: {title: "Add new record"},
                content: `<input type="text" name="name" />`,
                rejectClose: false,
                buttons: [{
                    action: "ok",
                    label: "Add",
                    icon: "fas fa-plus",
                    callback: (_event, button) => {
                        return {name: button.form.elements.name.value};
                    }
                }, {
                    action: "cancel",
                    label: "Cancel",
                    icon: "fa-solid fa-ban",
                    default: true,
                }]
            });
            const name = result?.name;
            if (!name) {
                return
            }

            this.subsystemData[name] = 0;
            this.render(true);
        });

        root.querySelector('.drop-list')?.addEventListener("change", async (event) => {
            this.dropListValue = $(event.currentTarget).val();
            this.subsystemData = this.getSubsystemData(this.dropListValue);
            this.render(true);
        });
    }

};

Hooks.on('getPartySheetPF2eHeaderButtons', function (app, buttons) {
    if (!game.settings.get(moduleName, "enableSubsystem")) {
        return;
    }

    if (!game.user.isGM) {
        return;
    }

    buttons.unshift({
        label: "Subsystems",
        icon: "fa fa-gears",
        class: `${moduleName}-sub-system`,
        onclick: () => {
            (new SubSystemForm({actor: app.actor})).render(true);
        }
    });
});

Hooks.on('renderLootSheetPF2e', function (partySheet, html, data) {
    if (!(game.user.isGM || game.settings.get(moduleName, "showPrintPC"))) {
        return
    }
    html.find('.content').find('.inventory').find('.currency').append(`<li><button type="button" class="print-inv" data-tooltip="Print Inventory"><i class="fas fa-print"></i></button></li>`)
    html.find('.content').find('.inventory').find('.currency').find('.print-inv').on("click", async function (event) {
        let tab = window.open('about:blank', '_blank');
        if (!tab || navigator?.appVersion?.includes("FoundryVirtualTabletop")) {
            saveDataToFile(fullGeneratePrintForActor(partySheet.actor), "text/html", `Printed_Inventory_${partySheet.actor.name}.html`)
        } else {
            tab.document.write(fullGeneratePrintForActor(partySheet.actor));
            tab.document.close();
        }
    })
});

Hooks.on('renderPartySheetPF2e', function (partySheet, html, data) {
    if (!(game.user.isGM || game.settings.get(moduleName, "showPrintPC"))) {
        return
    }
    html.find('.container').find('.inventory').find('.currency').append(`<li><button type="button" class="print-inv" data-tooltip="Print Inventory"><i class="fas fa-print"></i></button></li>`)
    html.find('.container').find('.inventory').find('.currency').find('.print-inv').on("click", async function (event) {
        let tab = window.open('about:blank', '_blank');
        if (!tab || navigator?.appVersion?.includes("FoundryVirtualTabletop")) {
            saveDataToFile(generatePrintForParty(partySheet.actor), "text/html", `Printed_Inventory_${partySheet.actor.name}.html`)
        } else {
            tab.document.write(generatePrintForParty(partySheet.actor));
            tab.document.close();
        }
    })
});

const SHORT_SAVES = {}

Hooks.on('pf2e.systemReady', function () {
    SHORT_SAVES[game.i18n.localize("PF2E.SavesFortitudeShort")] = 'fortitude'
    SHORT_SAVES[game.i18n.localize("PF2E.SavesReflexShort")] = 'reflex'
    SHORT_SAVES[game.i18n.localize("PF2E.SavesWillShort")] = 'will'

    if (game.settings.get(moduleName, "enableSubsystem")) {
        let or = CONFIG.Actor.sheetClasses.party['pf2e.PartySheetPF2e'].cls.prototype._renderInner
        CONFIG.Actor.sheetClasses.party['pf2e.PartySheetPF2e'].cls.prototype._renderInner = async function (data, options) {
            let html = await or.call(this, data, options);
            if (game.user.isGM || game.settings.get(moduleName, "showSubsystem")) {
                let party = this.object;
                const content = `
                <section class="tab sidebar-tab directory flexcol subsystem-section">
                    <ol class="directory-list subsystem-list">
                        ${subSystemRows(party)}
                    </ol>
                </section>`

                html.find('.sub-nav:not(.sub-sub-nav)').append('<a data-tab="sub-system" class="">Subsystems</a>')
                html.find('.container').append(`<div class="tab" data-tab="sub-system" data-region="sub-system"><div class="content">${content}</div></div>`)

                html.on('click', '.directory-item.folder > .folder-header', function (e) {
                    e.preventDefault();
                    const li = $(this).closest('.directory-item.folder');
                    let subSystem = li.data().subSystem;

                    if (isGM() && subSystem) {
                        let currentState = li.hasClass('collapsed') ? 'expanded' : 'collapsed';

                        party.setFlag(moduleName, "subsystems-expand", {
                            [subSystem]: currentState
                        })
                    } else {
                        li.toggleClass('collapsed expanded');
                    }
                });

                html.on('click', '.increase-sub-system-value', function (e) {
                    e.preventDefault();
                    let name = $(this).data().name;
                    let subSystem = $(this).data().subSystem;
                    if (subSystem && name) {
                        const subSystems = (party.getFlag(moduleName, "subsystems") ?? {})
                        if (subSystems?.[subSystem]?.[name] !== undefined) {
                            subSystems[subSystem][name] += 1;
                            party.setFlag(moduleName, "subsystems", subSystems)
                        }
                    }
                });

                html.on('click', '.decrease-sub-system-value', function (e) {
                    e.preventDefault();
                    let name = $(this).data().name;
                    let subSystem = $(this).data().subSystem;
                    if (subSystem && name) {
                        const subSystems = (party.getFlag(moduleName, "subsystems") ?? {})
                        if (subSystems?.[subSystem]?.[name] !== undefined) {
                            subSystems[subSystem][name] -= 1;
                            party.setFlag(moduleName, "subsystems", subSystems)
                        }
                    }
                });
            }
            return html;
        }
    }

    if (game.user.isGM && game.settings.get(moduleName, "showAfflictions")) {
        let or = CONFIG.Actor.sheetClasses.party['pf2e.PartySheetPF2e'].cls.prototype._renderInner
        CONFIG.Actor.sheetClasses.party['pf2e.PartySheetPF2e'].cls.prototype._renderInner = async function (data, options) {
            let html = await or.call(this, data, options);
            htmlAffliction(this.actor, html);
            return html
        }
    }

    if (game.settings.get(moduleName, "showAchievements")) {
        let or = CONFIG.Actor.sheetClasses.party['pf2e.PartySheetPF2e'].cls.prototype._renderInner
        CONFIG.Actor.sheetClasses.party['pf2e.PartySheetPF2e'].cls.prototype._renderInner = async function (data, options) {
            let html = await or.call(this, data, options);
            htmlAchievements(this.actor, html);
            return html
        }
    }
});

function generatePrintForParty(party) {
    let html = generatePrintForActor(party)
    html += party.members.filter(a => !a?.isOfType("familiar")).map(a => generatePrintForActor(a)).join('')
    if (game.settings.get(moduleName, "printExtendedInfo")) {
        html += `<br/>${detailedInfo(party)}`;
    }
    return html;
}

function fullGeneratePrintForActor(actor) {
    let html = generatePrintForActor(actor)
    if (game.settings.get(moduleName, "printExtendedInfo")) {
        let allItems = [
            ...actor.itemTypes.weapon,
            ...actor.itemTypes.armor,
            ...actor.itemTypes.equipment,
            ...actor.itemTypes.consumable,
            ...actor.itemTypes.treasure
        ]
        html += `<br/>${printItems(allItems, 'All items', true)}`;
    }
    return html;
}

function generatePrintForActor(actor) {
    let weapon = printItems(actor.itemTypes.weapon, "Weapons")
    let armor = printItems(actor.itemTypes.armor, "Armor")
    let equipment = printItems(actor.itemTypes.equipment, "Equipment")
    let consumable = printItems(actor.itemTypes.consumable, "Consumables")
    let treasure = printItems(actor.itemTypes.treasure, "Treasure")
    return `<h1>${actor.name}</h1>
      ${!weapon && !armor && !equipment && !consumable && !treasure ? 'No items' : ''}
      ${weapon}
      ${armor}
      ${equipment}
      ${consumable}
      ${treasure}
    `
}

function detailedInfo(party) {
    let allItems = [
        ...party.itemTypes.weapon,
        ...party.itemTypes.armor,
        ...party.itemTypes.equipment,
        ...party.itemTypes.consumable,
        ...party.itemTypes.treasure,
        ...party.members.filter(a => !a?.isOfType("familiar")).map(a => [
            ...a.itemTypes.weapon,
            ...a.itemTypes.armor,
            ...a.itemTypes.equipment,
            ...a.itemTypes.consumable,
            ...a.itemTypes.treasure,
        ]).flat()
    ]

    return printItems(allItems, 'All items', true);
}

function printItems(items, name, extend = false) {
    let i = items.map(a => `<li>${a.name} ${a.quantity > 1 ? '(x' + a.quantity + ')' : ''} ${a?.identificationStatus === 'unidentified' || !game.settings.get(moduleName, "printShowPrice") ? '' : a.price.value}${extend ? extendInfo(a) : ''}</li>`);
    i = i.length === 0 ? '' : `<h3>${name}</h3><ol style="list-style: inside;">${i.join('')}</ol>`
    return i;
}

function extendInfo(a) {
    return ` <br/> ${[a.rarity, ...a.traits].map((a) => {
        return allTraits[a] ? game.i18n.localize(allTraits[a]) : a
    }).join(', ').toUpperCase()} <br/> ${a.description}`
}

const subSystemLabels = {
    "reputation": "Reputation",
    "victory-points": "Victory Points",
    "influence": "Influence",
    "research": "Research",
    "chases": "Chases",
    "infiltration": "Infiltration",
}

function subSystemRows(party) {
    const subSystems = (party.getFlag(moduleName, "subsystems") ?? {})
    const subSystemsExpand = (party.getFlag(moduleName, "subsystems-expand") ?? {})

    return Object.keys(subSystems).map(obj => {
        let state = subSystemsExpand[obj] ?? 'collapsed';

        let a = `<li class="directory-item folder flexcol ${state}" data-sub-system="${obj}">
          <header class="folder-header flexrow">
            <h3 class="noborder"><i class="fas fa-folder-open fa-fw"></i>${subSystemLabels[obj]}</h3>
          </header>
          <ol class="subdirectory plain">
                ${subSystemRow(obj, subSystems[obj], SUBSYSTEM_TIERS_LABELS[obj])}
          </ol>
        </li>`
        return a;
    }).join("")
}

function getTierLabelByValue(value, labels) {
    if (!labels) {
        return ""
    }
    let r = labels.find(s => value <= s[0]);
    if (!r) {
        return ""
    }

    return ` (${game.i18n.localize(r[1])})`
}

function subSystemRow(subSystemName, subSystem, labels) {
    return Object.entries(subSystem).sort()
        .map(a => `<li class="directory-item entry" style="display: flex;flex-direction: row;">
                <h3 class="entry-name">${a[0]}</h3><span>${subSystemRowSpanText(subSystemName, a[0], a[1], labels)}</span>
            </li>`
        ).join("");
}

function subSystemRowSpanText(subSystemName, name, value, labels) {
    if (game.user.isGM) {
        return ` <i class="fa-solid fa-minus decrease-sub-system-value" data-sub-system="${subSystemName}" data-name="${name}" ></i>   `
            + value
            + `   <i class="fa-solid fa-plus increase-sub-system-value" data-sub-system="${subSystemName}" data-name="${name}" ></i> `
            + getTierLabelByValue(value, labels);
    }
    return value + getTierLabelByValue(value, labels);
}

//Influence

let POINT_MAP = {
    'criticalFailure': -1,
    'failure': 0,
    'success': 1,
    'criticalSuccess': 2,
}

const SUBSYSTEM_ACTION_REGEXP = new RegExp('action:(reputation|victory-points|influence|research|chases|infiltration)', '');

Hooks.on("preCreateChatMessage", async (message) => {
    if (!game.settings.get(moduleName, "enableSubsystem")) {
        return
    }

    if (message?.flags?.[game.system.id]?.context?.type !== "skill-check") {
        return
    }
    if (!message?.flags?.[game.system.id]?.context?.options) {
        return
    }
    let filtered = message?.flags?.[game.system.id]?.context?.options.filter((opt) => opt.match(SUBSYSTEM_ACTION_REGEXP));
    if (filtered.length === 0) {
        return
    }
    let systemName = filtered[0].substring(7)
    if (!message?.actor?.parties) {
        return
    }
    if (!message.actor.parties.first()) {
        return
    }
    let name = message?.flags?.[game.system.id]?.context?.options.find(a => a.startsWith('npc-name'))
    if (!name) {
        return
    }
    name = name.substring(9).trim();
    let outcome = message?.flags?.[game.system.id]?.context?.outcome
    let outcomeValue = (POINT_MAP[outcome] ?? 0);

    if (message.isReroll) {
        let unadjustedOutcomeValue = (POINT_MAP[message?.flags?.[game.system.id]?.context?.unadjustedOutcome] ?? 0);
        outcomeValue = outcomeValue + (-unadjustedOutcomeValue)
    }

    let system = subsystemData(message.actor.parties.first(), systemName)
    system[name] = (system[name] ?? 0) + outcomeValue

    await saveSubsystemData(message.actor.parties.first(), systemName, system)
});

function subsystemData(party, name) {
    return JSON.parse(JSON.stringify((party.getFlag(moduleName, "subsystems") ?? {})?.[name] ?? {}));
}

async function saveSubsystemData(party, name, obj) {
    const subsystems = JSON.parse(JSON.stringify(party.getFlag(moduleName, "subsystems") ?? {}));
    subsystems[name] = obj;

    await party.unsetFlag(moduleName, "subsystems");
    await party.setFlag(moduleName, "subsystems", subsystems);
};
