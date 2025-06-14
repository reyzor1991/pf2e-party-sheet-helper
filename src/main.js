const moduleName = "pf2e-party-sheet-helper";

const SUBSYSTEM_TIERS_LABELS = {
    "reputation": [
        [-30, `${moduleName}.subsystems.reputation.labels.hunted`],
        [-15, `${moduleName}.subsystems.reputation.labels.hated`],
        [-5, `${moduleName}.subsystems.reputation.labels.disliked`],
        [4, `${moduleName}.subsystems.reputation.labels.ignored`],
        [14, `${moduleName}.subsystems.reputation.labels.liked`],
        [29, `${moduleName}.subsystems.reputation.labels.admired`],
        [50, `${moduleName}.subsystems.reputation.labels.revered`],
        [200, `${moduleName}.subsystems.reputation.labels.revered`]
    ]
};


function isGM() {
    return game.users.activeGM === game.user;
}

async function sendItemToActor(ownerId, targetId, itemId, qty, stack) {
    const target = game.actors.get(targetId)
    if (!hasPermissions(target)) {
        executeAsGM(SEND_ITEM, {
            ownerId, targetId, itemId, qty, stack
        })
        return
    }

    const owner = game.actors.get(ownerId)
    if (!owner || !target) return

    const item = owner.items.get(itemId)
    if (!item) return

    owner.transferItemToActor(target, item, qty, undefined, stack);

    ChatMessage.create({
        style: CONST.CHAT_MESSAGE_STYLES.EMOTE,
        flavor: `<h4 class="action"><strong>Interact</strong><span class="action-glyph">A</span><span class="subtitle">(Give item)</span></h4><div class="tags"><span class="tag tooltipstered" data-slug="manipulate" data-description="PF2E.TraitDescriptionManipulate">Manipulate</span></div><hr class="action-divider">`,
        content: `<p class="action-content"><img src="${item.img}">${owner.name} gives ${qty} × ${item.name} to ${target.name}.</p>`,
        speaker: ChatMessage.getSpeaker({actor: owner}),
    })
}

const dcByLevel = new Map([
    [-1, 13],
    [0, 14],
    [1, 15],
    [2, 16],
    [3, 18],
    [4, 19],
    [5, 20],
    [6, 22],
    [7, 23],
    [8, 24],
    [9, 26],
    [10, 27],
    [11, 28],
    [12, 30],
    [13, 31],
    [14, 32],
    [15, 34],
    [16, 35],
    [17, 36],
    [18, 38],
    [19, 39],
    [20, 40],
    [21, 42],
    [22, 44],
    [23, 46],
    [24, 48],
    [25, 50],
]);

let allTraits = {}

const golarionMileInFeet = 6000;

// general constants
const minutesPerDay = 24 * 60;
const minutesPerWeek = minutesPerDay * 7;

const gradient = [
    [0, [255, 0, 0]],
    [50, [204, 204, 0]],
    [100, [0, 128, 0]],
];
const sliderWidth = 500;

function healthStatuses() {
    const list = game.settings.get(moduleName, "healthStatus").split(',').map(a => a.trim());
    if (list.length >= 2) {
        const perStage = Math.round(10000 / (list.length - 2)) / 100;
        const stages = [{label: list[0], percent: {from: 0, to: 0}}]
        stages.push(...list.slice(1, -1).map((el, idx) => {
            return {label: el, percent: {from: idx * perStage, to: (idx + 1) * perStage}};
        }));
        stages.push({label: list[list.length - 1], percent: {from: 100, to: 100}})
        return stages;
    }

    return [];
}

function calculateColor(percent) {
    if (percent === 0 || isNaN(percent)) return gradient[0][1];

    let colorRange = []
    for (let i = 0; i < gradient.length; i++) {
        if (percent <= gradient[i][0]) {
            colorRange = [i - 1, i]
            break;
        }
    }

    //Get the two closest colors
    const firstcolor = gradient[colorRange[0]][1];
    const secondcolor = gradient[colorRange[1]][1];


    //Calculate ratio between the two closest colors
    const firstcolor_x = sliderWidth * (gradient[colorRange[0]][0] / 100);
    const secondcolor_x = sliderWidth * (gradient[colorRange[1]][0] / 100) - firstcolor_x;

    const slider_x = sliderWidth * (percent / 100) - firstcolor_x;
    const ratio = slider_x / secondcolor_x

    return pickHex(secondcolor, firstcolor, ratio);
}

function pickHex(color1, color2, weight) {
    const w1 = weight;
    const w2 = 1 - w1;
    return [Math.round(color1[0] * w1 + color2[0] * w2),
        Math.round(color1[1] * w1 + color2[1] * w2),
        Math.round(color1[2] * w1 + color2[2] * w2)];
}

function healthEstimateForActor(actor, html, statuses) {
    const percent = game.settings.get("pf2e", "staminaVariant")
        ? ((actor.system.attributes.hp.value + (actor.system.attributes.hp.sp?.value ?? 0)) / (actor.system.attributes.hp.max + (actor.system.attributes.hp.sp?.max ?? 0))) * 100
        : (actor.system.attributes.hp.value / actor.system.attributes.hp.max) * 100;
    let color = calculateColor(percent);
    let label = '?';
    if (percent === 0) {
        label = statuses[0].label
    } else if (percent === 100) {
        label = statuses[statuses.length - 1].label
    } else {
        label = statuses.find((e) => percent <= e.percent.to && percent >= e.percent.from)?.label ?? 'Undefined';
    }

    const overHpBar = html.find(`div[data-tab="overview"]`).find(`.member[data-actor-uuid="${actor.uuid}"]`).find('.health-bar:not(.stamina-bar)');
    const expHpBar = html.find(`div[data-tab="exploration"]`).find(`.content[data-actor-uuid="${actor.uuid}"]`).parent().find('.health-bar:not(.stamina-bar)');
    if (!game.user.isGM) {
        overHpBar.find('span').text(`${label}`);
        overHpBar.find('.bar').css({'background-color': `rgb(${color[0]},${color[1]},${color[2]})`});

        expHpBar.find('span').text(`${label}`);
        expHpBar.find('.bar').css({'background-color': `rgb(${color[0]},${color[1]},${color[2]})`});
    } else {
        overHpBar.attr("data-tooltip", label)
        expHpBar.attr("data-tooltip", label)
    }

    if (game.settings.get("pf2e", "staminaVariant")) {

        const expSpBar = html.find(`div[data-tab="exploration"]`).find(`.content[data-actor-uuid="${actor.uuid}"]`).parent().find('.stamina-bar');
        const overSpBar = html.find(`div[data-tab="overview"]`).find(`.member[data-actor-uuid="${actor.uuid}"]`).find('.stamina-bar');
        if (!game.user.isGM) {
            overSpBar.find('span').text(`${label}`);
            overSpBar.find('.bar').css({'background-color': `rgb(${color[0]},${color[1]},${color[2]})`});

            expSpBar.find('span').text(`${label}`);
            expSpBar.find('.bar').css({'background-color': `rgb(${color[0]},${color[1]},${color[2]})`});
        } else {
            overSpBar.attr("data-tooltip", label)
            expSpBar.attr("data-tooltip", label)
        }
    }
}

Hooks.on('init', function () {
    game.settings.register(moduleName, "healthStatus", {
        name: "Health status at party sheet",
        scope: "world",
        config: true,
        default: "Unconscious, Near Death, Badly Injured, Injured, Barely Injured, Unharmed",
        type: String,
    });
    game.settings.register(moduleName, "useHealthStatus", {
        name: "Use Health Status at party sheet",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });
    game.settings.register(moduleName, "partyLeader", {
        name: "Possibility to set party leader",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });
    game.settings.register(moduleName, "hideWealthFromPC", {
        name: "Hide Wealth from PCs",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });
    game.settings.register(moduleName, "enableSubsystem", {
        name: "Enable subsystems",
        scope: "world",
        config: true,
        default: false,
        requiresReload: true,
        type: Boolean,
    });
    game.settings.register(moduleName, "showSubsystem", {
        name: "Show subsystems to PCs",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });
    game.settings.register(moduleName, "showAchievements", {
        name: "Show achievements",
        scope: "world",
        config: true,
        default: false,
        requiresReload: true,
        type: Boolean,
    });
    game.settings.register(moduleName, "showEncounterData", {
        name: "Show encounter base info",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });
    game.settings.register(moduleName, "showAfflictions", {
        name: "Show afflictions",
        scope: "world",
        config: true,
        default: false,
        requiresReload: true,
        type: Boolean,
    });
    game.settings.register(moduleName, "showEffects", {
        name: "Show effects",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });
    game.settings.register(moduleName, "showFocus", {
        name: "Show Focus Points",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });
    game.settings.register(moduleName, "showSpells", {
        name: "Show Spells Info",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });
    game.settings.register(moduleName, "showPrintPC", {
        name: "Show print button to PC",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });
    game.settings.register(moduleName, "printExtendedInfo", {
        name: "Print extended info",
        hint: "Print rarity, traits, description",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });
    game.settings.register(moduleName, "printShowPrice", {
        name: "Print price of items",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });
    game.settings.register(moduleName, "hideGeneralInfo", {
        name: "Hide general info about player at Party Sheet",
        hint: "Hide information about race/class/sex",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });
    game.settings.register(moduleName, "maxEncumbrance", {
        name: "Set max encumbrance for party sheet",
        scope: "world",
        config: true,
        default: 0,
        type: Number,
    });
    game.settings.register(moduleName, "maxEncumbranceBehaviour", {
        name: "Behaviour of Max Encumbrance logic",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "notify": "Sent notification",
            "notadd": "Not add to stash"
        },
        default: "notify",
        onChange: value => {
        }
    });
    game.settings.register(moduleName, "skills", {
        name: "Store last skills rolls for GM",
        hint: 'Now only deception/perception/stealth skills',
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });
    game.settings.register(moduleName, "shareHero", {
        name: "Share hero points between party and heroes",
        hint: '',
        scope: "world",
        config: true,
        default: 0,
        type: Number,
    });
    game.settings.register(moduleName, "defaultCalculatorValue", {
        name: "Use feet as default value",
        hint: 'for calculate speed (easy mod)',
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });
});

Hooks.on('renderSidebarTab', function (tab, html) {
    if (!game.user.isGM) {
        return;
    }
    if (tab.id !== 'actors') {
        return;
    }

    const header = html.find('.directory-list').find('.party-list').find('header');
    if (!header.length) {
        return
    }

    const row = header.find('.noborder');
    if (row.find('.create-combat').length === 0) {
        const newBtn = `<a class="create-combat left-control" data-tooltip="Create Combat"><i class="fas fa-swords"></i></a>`;
        $(newBtn).insertBefore(row.find('span'));

        $(row.find('.create-combat')).on("click", async function (el) {
            el.stopPropagation();

            let party = game.actors.get($(el.currentTarget).closest('header').data()?.documentId)
            if (!party) {
                return
            }

            let tokens = party.members.filter(a => !a?.isOfType("familiar")).filter(a => !["eidolon", 'animal-companion'].includes(a.class?.slug)).map(m => m.getActiveTokens(true, true)).flat();
            if (game.combat) {
                let included = game.combat.turns.map(a => a.token.id)
                tokens = tokens.filter(a => !included.includes(a.id))
                await game.combat.createEmbeddedDocuments("Combatant", tokens.map(t => {
                    return {
                        tokenId: t.id,
                        actorId: t.actor?.id,
                        sceneId: t.scene.id,
                    }
                }))
                ui.notifications.info("Combatants were added");
                return
            }

            await Combat.create({scene: canvas.scene.id, active: true});
            if (tokens.length > 0) {
                await game.combat.createEmbeddedDocuments("Combatant", tokens.map(t => {
                    return {
                        tokenId: t.id,
                        actorId: t.actor?.id,
                        sceneId: t.scene.id,
                    }
                }))
                ui.notifications.info("Combat was created");
            }
        });
    }
    if (row.find('.damage-all').length === 0) {
        const dBtn = `<a class="damage-all left-control" data-tooltip="Damage/Heal All"><i class="fas fa-mace"></i></a>`;
        $(dBtn).insertBefore(row.find('span'));

        $(row.find('.damage-all')).on("click", async function (el) {
            el.stopPropagation();

            let party = game.actors.get($(el.currentTarget).closest('header').data()?.documentId)
            if (!party) {
                return
            }

            let DamageRoll = CONFIG.Dice.rolls.find((r) => r.name === "DamageRoll")
            if (!DamageRoll) {
                return
            }
            const {formula} = await Dialog.wait({
                title: "Apply damage/heal",
                content: `<input type="text" name="name" /><br/><p>Positive value for Heal, negative for Damage</p>`,
                buttons: {
                    ok: {
                        label: "Apply",
                        icon: "<i class='fas fa-plus'></i>",
                        callback: (html) => {
                            return {formula: html.find('input').val()}
                        }
                    },
                    cancel: {
                        label: "Cancel",
                        icon: "<i class='fa-solid fa-ban'></i>",
                    }
                },
                default: "cancel"
            });
            if (!formula) {
                return
            }

            let roll;
            if (Number.isNumeric(formula)) {
                roll = Number.parseInt(formula)
            } else {
                roll = new DamageRoll(formula.startsWith("-") ? formula.slice(1) : formula);
                await roll.evaluate({async: true});
                roll.toMessage();
                if (formula.startsWith("-")) {
                    roll = -(roll.total)
                }
            }

            roll *= -1;

            party.members.forEach((actor, index) => {
                actor.applyDamage({damage: roll, token: actor.getActiveTokens(true, false)[0]});
            });

        });
    }
})

async function handleSkillRoll(event, partySheet) {
    const skill = $(event.currentTarget).data().slug;
    if (!skill) {
        return
    }
    const isRecKnow = $(event.currentTarget).closest(".summary").find('nav > .active').data()?.view === 'rk'

    const levels = partySheet.actor.members.map(a => a.level)
    const defDC = (dcByLevel.get(Math.round(levels.reduce((a, b) => a + b, 0) / levels.length)) ?? 50);

    const isSecret = (event.ctrlKey || event.metaKey);

    const {dc} = await Dialog.wait({
        title: "DC of skill",
        content: `
            <h3>DC of check</h3>
            <input id="skill-dc" type="number" min="0" value=${defDC} />
        `,
        buttons: {
            ok: {
                label: "Create DC Template",
                icon: "<i class='fa-solid fa-magic'></i>",
                callback: (html) => {
                    return {dc: parseInt(html[0].querySelector("#skill-dc").value)}
                }
            },
            cancel: {
                label: "Cancel",
                icon: "<i class='fa-solid fa-ban'></i>",
            }
        },
        default: "ok"
    });
    if (dc === undefined) {
        return;
    }

    let traits = []
    if (isSecret) {
        traits.push('secret')
    }
    if (isRecKnow) {
        traits.push('action:recall-knowledge')
    }
    traits = traits.join(',')
    const content = `@Check[type:${skill}|dc:${dc}${traits ? '|traits:' + traits : ''}]{${skill.capitalize()} Check}`
    if (event.shiftKey) {
        navigator.clipboard.writeText(content);
        ui.notifications.info("Copied the text of check");
    } else {
        ChatMessage.create({
            style: CONST.CHAT_MESSAGE_STYLES.OOC,
            content
        });
    }
}

async function handleSaveRoll(event, partySheet) {
    const saveText = $(event.currentTarget).find('label').text();
    let save = SHORT_SAVES[saveText];
    if (!save) {
        return
    }

    const levels = partySheet.actor.members.map(a => a.level)
    const defDC = (dcByLevel.get(Math.round(levels.reduce((a, b) => a + b, 0) / levels.length)) ?? 50);

    const isSecret = (event.ctrlKey || event.metaKey);


    const {dc} = await Dialog.wait({
        title: "DC of skill",
        content: `
            <h3>DC of check</h3>
            <input id="skill-dc" type="number" min="0" value=${defDC} />
        `,
        buttons: {
            ok: {
                label: "Create DC Template",
                icon: "<i class='fa-solid fa-magic'></i>",
                callback: (html) => {
                    return {dc: parseInt(html[0].querySelector("#skill-dc").value)}
                }
            },
            cancel: {
                label: "Cancel",
                icon: "<i class='fa-solid fa-ban'></i>",
            }
        },
        default: "ok"
    });
    if (dc === undefined) {
        return;
    }

    let secret = isSecret ? '|traits:secret' : ''

    const content = `@Check[type:${save}|dc:${dc}${secret}]{${save.capitalize()} Check}`
    if (event.shiftKey) {
        navigator.clipboard.writeText(content);
        ui.notifications.info("Copied the text of check");
    } else {
        ChatMessage.create({
            style: CONST.CHAT_MESSAGE_STYLES.OOC,
            content
        });
    }
}

function addStamina(partySheet, html) {
    if (!game.settings.get("pf2e", "staminaVariant")) {
        return
    }

    partySheet.actor.members.forEach((actor) => {
        html.find(`div[data-tab="overview"]`).find(`.member[data-actor-uuid="${actor.uuid}"]`).find('.health-bar').css({'bottom': '10px'});
        const percent = !actor.system.attributes.hp.sp ? -1 : (actor.system.attributes.hp.sp.value / actor.system.attributes.hp.sp.max) * 100;
        let text = percent < 0 ? '-' : `${actor.system.attributes.hp.sp.value} / ${actor.system.attributes.hp.sp.max}`;
        html.find(`div[data-tab="overview"]`).find(`.member[data-actor-uuid="${actor.uuid}"]`).find('.portrait')
            .append(`<div class="health-bar stamina-bar" style=" bottom: -10px;"><div class="bar" style="width: ${percent < 0 ? 0 : percent}%; background-color: #3535d7;"></div><span><i class="fa-solid fas fa-running"></i>${text}</span></div>`)

        html.find(`div[data-tab="exploration"]`).find(`.content[data-actor-uuid="${actor.uuid}"]`).parent()
            .append(`<footer class="health-bar stamina-bar"><div class="bar" style="width: ${percent < 0 ? 0 : percent}%; background-color: #3535d7;"></div><span><i class="fas fa-running"></i>${text}</span></footer>`);

    });
}

Hooks.on('renderPartySheetPF2e', function (partySheet, html) {
    html.find('.skills > .tag-light').click(async (event) => {
        await handleSkillRoll(event, partySheet)
    })
    html.find('section.saving-throws .score').click(async (event) => {
        await handleSaveRoll(event, partySheet)
    })
    addStamina(partySheet, html)

    if (game.settings.get(moduleName, "useHealthStatus")) {
        const statuses = healthStatuses();
        if (statuses.length) {
            partySheet.actor.members.forEach((actor) => {
                healthEstimateForActor(actor, html, statuses);
            });
        }
    }

    let showEffects = game.settings.get(moduleName, "showEffects");
    let showFocus = game.settings.get(moduleName, "showFocus");
    let showSpells = game.settings.get(moduleName, "showSpells");

    const partyItems = html.find('[data-tab=overview] .member');
    partyItems.each((index, element) => {
        const aId = $(element).data().actorUuid.replace('Actor.', '');
        const actor = game.actors.get(aId);

        if (showEffects) {
            const senses = (actor?.system?.perception?.senses ?? []).map(sense => sense.label);
            const data = senses.length > 0 ? `<label  class="senses-text" data-tooltip="${senses.join('<br/>')}">Senses</label>` : `<label class="senses-text">No Special Senses</label>`
            $(element).find('.score.senses').addClass("senses-new")
            $(element).find('.score.senses').html(data);

            if ($(element).find('.elements').length === 0) {
                let baseEff = [...actor.itemTypes.condition, ...actor.itemTypes.effect];
                if (!game.user.isGM) {
                    baseEff = baseEff.filter(a => a.isIdentified);
                }
                const span = baseEff.map(a => {
                    let span = `<div class="item-image" style="background-image: url(${a.img})" data-tooltip="${a.name}">`
                    if (a.value && a.value > 0) {
                        span += `<div class="value-wrapper"><div class="value"><strong style="display: inline;">${a.value}</strong></div></div>`
                    }
                    span += `</div>`
                    return span;
                }).join('')
                const effects = `<section class="effects"><div class="value" style="display: flex;">${span}</div></section>`
                $(element).find('.main-stats').append(effects)
            }
        }

        if (showFocus && actor && actor.isOfType("character") && actor.system.resources.focus.max > 0) {
            let pips = '<span class="pips">'
            let val = actor.system.resources.focus.value;
            for (let i = 0; i < actor.system.resources.focus.max; i++) {
                pips += `<i class='${val > i ? "fa-solid fa-dot-circle" : "fa-regular fa-circle"}'></i>`
            }
            pips += '</span>'
            $(element).find('.saving-throws').after(`<section class="focus"><div class="value"><h4>Focus</h4>${pips}</div></section>`)
        }
        if (showSpells) {
            let spells = spellData(actor)
            if (spells.length > 0) {
                $(element).find('.saving-throws').after(`<section class="spells-data"><label class="spells-text" data-tooltip="${spells.map(a => `${a.type} ${a.rank} Rank - ${a.active}/${a.max}`).join('<br/>')}">Spells Info</label></section>`)
            }
        }
    });

    if (game.settings.get(moduleName, "partyLeader")) {
        if (html.find('leader-position').length === 0) {
            const lead = partySheet.actor.getFlag(moduleName, "leader") ?? 'none';

            const members = partySheet.actor.members.filter(a => !a?.isOfType("familiar"))
                .filter(a => !["eidolon", 'animal-companion'].includes(a.class?.slug))
                .map(a => `<option value="${a.uuid}" ${lead === a.uuid ? 'selected' : ''}>${a.name}</option>`).join('')

            html.find('.content').find('.summary > nav')
                .append(`<div class="leader-position"><label>Choose a leader:</label><select name="leader" class="change-leader"><option value="none" ${lead === 'none' ? 'selected' : ''}>None</option>${members}</select></div>`)

            if (lead != 'none') {
                const aaa = html.find('div[data-tab="overview"]').find('div.content')
                aaa.find('.member').sort(function (a, b) {
                    return a.dataset.actorUuid === lead ? -1 : 1;
                })
                    .appendTo(aaa);
            }

            $(html.find('.change-leader')).on("change", async function (el) {
                await partySheet.actor.setFlag(moduleName, "leader", $(this).val());
            });
        }
    }

    if (game.settings.get(moduleName, "hideWealthFromPC") && !game.user.isGM) {
        html.find('.inventory-members').find('.sub-data > .value').addClass("hidden");

        $(html.find('.inventory-members').find('.summary-data').children()[1]).css({display: "none"})
    }

    const expBnt = `<div><a class="travel-duration" data-document-id="${partySheet.actor.id}" >Calculate Travel duration   <i class="far fa-clock"></i></a></div>`;
    const expBntSrt = `<div><a class="travel-duration-short" data-document-id="${partySheet.actor.id}" >Calculate Travel (Easy mod)  <i class="far fa-clock"></i></a></div>`;
    html.find('.exploration-members').find('.summary-data').append(expBnt).append(expBntSrt)

    $(html.find('.travel-duration')).on("click", async function (el) {
        el.stopPropagation();
        const party = game.actors.get($(el.currentTarget).data().documentId)

        const members = party.members.filter(a => !a?.isOfType("familiar")).filter(a => !["eidolon", 'animal-companion'].includes(a.class?.slug))
        if (members.length > 0) {
            game.pf2e.gm.launchTravelSheet(members);
        }
    });

    $(html.find('.travel-duration-short')).on("click", async function (el) {
        el.stopPropagation();
        const party = game.actors.get($(el.currentTarget).data().documentId)
        const members = party.members.filter(a => !a?.isOfType("familiar")).filter(a => !["eidolon", 'animal-companion'].includes(a.class?.slug))

        if (members.length > 0) {
            let speed = Math.min(...members.map(m => m.attributes.speed.total));


            let options = game.settings.get(moduleName, "defaultCalculatorValue")
                ? `<option value="feet" selected>Feet</option>
                                <option value="miles" >Miles</option>`
                : `<option value="feet">Feet</option>
                            <option value="miles" selected>Miles</option>`

            new foundry.applications.api.DialogV2({
                window: {title: "Calculator"},
                content: `<form><div class="form-group travel-duration">
                    <div class="journey-calc">
                        <label>Average speed</label>
                        <input name="speed" value=${speed} type="number" data-dtype="Number">
                        </br>
                        <label>Distance</label>
                        <input name="distance" value="0" type="number" data-dtype="Number">
                        <select name="distanceUnit">
                           ${options}
                        </select>
                    </div>
                </div></form>`,
                buttons: [
                    {
                        action: 'ok',
                        label: "Calculate",
                        callback: async (e) => {
                            let html = e.target.closest('form')

                            speed = html.querySelector("[name=speed]").value;
                            let dist = html.querySelector("[name=distance]").value;
                            const unit = html.querySelector("[name=distanceUnit]").value;

                            if (unit === 'miles') {
                                dist *= golarionMileInFeet;
                            }
                            const totalMinutes = Math.round(dist / (speed * 10));

                            const weeks = Math.floor(totalMinutes / minutesPerWeek);
                            const days = Math.floor((totalMinutes - weeks * minutesPerWeek) / minutesPerDay);
                            const hours = Math.floor((totalMinutes - weeks * minutesPerWeek - days * minutesPerDay) / 60);
                            const minutes = totalMinutes - weeks * minutesPerWeek - days * minutesPerDay - hours * 60;

                            const message = `${weeks ? 'Weeks ' + weeks + ' ' : ''}${days ? 'Days ' + days + ' ' : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

                            ui.notifications.info("Total duration: " + message);
                        }
                    },
                    {
                        action: "cancel",
                        label: "Cancel"
                    }
                ],
                default: "cancel",
            }).render(true);
        }
    });

    const foodMembers = partySheet.actor.members.filter(a => !a?.isOfType("familiar")).filter(a => !["eidolon", 'animal-companion'].includes(a.class?.slug));
    const allFood = [...foodMembers.map(a => [...a.itemTypes.equipment, ...a.itemTypes.consumable]).flat(), ...partySheet.actor.itemTypes.equipment, ...partySheet.actor.itemTypes.consumable]

    const rations = allFood.filter(a => a.slug === "rations")
        .map(a => a.uses.value + (a.uses.max * (a.quantity - 1)))
        .reduce((accumulator, currentValue) => {
            return accumulator + currentValue
        }, 0);
    const rationTonic = allFood.filter(a => a.slug === "ration-tonic")
        .map(a => a.quantity)
        .reduce((accumulator, currentValue) => {
            return accumulator + currentValue
        }, 0);
    const rationTonicGreater = allFood.filter(a => a.slug === "ration-tonic-greater")
        .map(a => 7 * a.quantity)
        .reduce((accumulator, currentValue) => {
            return accumulator + currentValue
        }, 0);
    const water = allFood.filter(a => a.slug === "waterskin")
        .map(a => a.quantity)
        .reduce((accumulator, currentValue) => {
            return accumulator + currentValue
        }, 0);

    html.find('.exploration-members').find('.summary-data')
        .append(`<div><label>Food per Party—Days</label><span class="value">${Math.floor((rations + rationTonic + rationTonicGreater) / foodMembers.length)}</span></div>`)
        .append(`<div><label>Water per Party—Days</label><span class="value">${Math.floor(water / foodMembers.length)}</span></div>`)

    let max = game.settings.get(moduleName, "maxEncumbrance");
    if (max && max > 0) {
        let bar = html.find('.total-bulk').find('.inventory-header')
        bar.css("justify-content", "space-between");
        bar.append(`<span>Max Bulk: ${max}</span>`)
    }

    if (game.settings.get(moduleName, "hideGeneralInfo")) {
        html.find('[data-tab="overview"]').find('.member header .blurb').hide()
    }
});

function spellData(actor) {
    let data = []
    let slotsEntry = actor.itemTypes.spellcastingEntry.filter(a => a.isPrepared).map(a => a?.system?.slots).filter(a => a);
    slotsEntry.forEach(slots => {
        let keys = Object.keys(slots).filter(a => a !== 'slot0')

        keys.forEach(k => {
            if (slots[k].max > 0) {
                data.push({
                    type: 'Prepared',
                    rank: Number(k.substring(4)),
                    active: Object.values(slots[k].prepared).filter(a => !a.expended).length,
                    max: slots[k].max
                });
            }
        })
    });

    let spontaneousEntry = actor.itemTypes.spellcastingEntry.filter(a => a.isSpontaneous).map(a => a?.system?.slots).filter(a => a);
    spontaneousEntry.forEach(slots => {
        let keys = Object.keys(slots).filter(a => a !== 'slot0')

        keys.forEach(k => {
            if (slots[k].max > 0) {
                data.push({
                    type: 'Spontaneous',
                    rank: Number(k.substring(4)),
                    active: slots[k].value,
                    max: slots[k].max
                });
            }
        })
    });

    let innateEntry = actor.itemTypes.spellcastingEntry.filter(a => a.isInnate);
    innateEntry.forEach(slots => {
        let spells = slots.spells.contents.map(a => a.system.location);
        spells.forEach(k => {
            if (k.uses.max > 0 && k.heightenedLevel) {
                data.push({
                    type: 'Innate',
                    rank: k.heightenedLevel,
                    active: k.uses.value,
                    max: k.uses.max
                });
            }
        })
    });

    return data;
}


Hooks.on('renderActorSheetPF2e', function (sheet, html) {
    if (sheet.actor.type !== "character") {
        return
    }
    if (sheet.actor.parties.size === 0) {
        return
    }

    const parties = [...sheet.actor.parties];
    const partyActors = parties
        .map(p => p.members).flat().filter(a => a.id !== sheet.actor.id)
        .filter(a => !a?.isOfType("familiar")).filter(a => !["eidolon", 'animal-companion'].includes(a.class?.slug));

    html.find('.sheet-content .wealth')
        .append('<a class="show-party-members" title="Party Members" style=""><i class="fa-solid fa-address-card"></i></a>')

    const members = [...partyActors, ...parties].map(a => `<li class="box "><div class="actor-link content" data-actor-uuid="${a.uuid}" data-action="open-sheet" data-tab="inventory"><img src="${a.getActiveTokens(false, true)[0]?.texture?.src ?? a.img}" data-tooltip="${a.name}"></div><div class="footer"><i class="fa-solid fa-weight-hanging"></i> ${toBulk(a.inventory.bulk.value)}/${a?.isOfType('party') ? '∞' : a.inventory.bulk.encumberedAfter + 'B'}</div></li>`).join('');
    const memberList = `<form><section data-region="inventoryMembers"><ol class="box-list inventory-members" style="flex-direction: row; flex-wrap: wrap; justify-content: center;">${members}</ol></section><form>`
    html.find('.sheet-content').find('.coinage').append(`<div class="sidebar-party-members" style="display: ${sheet.actor.getFlag(moduleName, 'partySharingDisplay') ?? 'none'}">${memberList}</aside>`);

    $(html.find('.show-party-members')).on("click", async function (el) {
        el.stopPropagation();
        html.find('.sidebar-party-members').toggle();

        sheet.actor.update({
            flags: {
                [moduleName]: {
                    'partySharingDisplay': html.find('.sidebar-party-members').css('display') ?? 'none'
                }
            }
        }, {"noHook": true});
    });
});

function toBulk(bulk) {
    let data = '';

    if (bulk?.normal > 0) {
        data += ` ${bulk?.normal}B`
    }
    if (bulk?.light > 0) {
        data += `${!!data ? ',' : ''}${bulk?.light}L`
    }

    return data;
}

Hooks.once("ready", () => {
    allTraits = {
        ...CONFIG.PF2E.equipmentTraits,
        ...CONFIG.PF2E.weaponTraits,
    };

    socketListener()
});

Hooks.on("ready", () => {
    const charSheet = foundry.documents.collections.Actors.registeredSheets.find(a => a.name === "CharacterSheetPF2e");
    if (!charSheet) {
        return
    }
    const originCall = charSheet.prototype._onDropItem

    charSheet.prototype._onDropItem = async function (event, data) {
        const droppedRegion = event.target?.closest("[data-region]")?.dataset?.region;
        const targetActor = event.target?.closest("[data-actor-uuid]")?.dataset?.actorUuid;

        if (droppedRegion === "inventoryMembers" && targetActor) {
            const item = await CONFIG.Item.documentClass.fromDropData(data);
            if (!item) return [];
            const actorUuid = foundry.utils.parseUuid(targetActor).documentId;
            if (actorUuid && item?.actor && item?.isOfType("physical")) {
                const result = await new MoveLootPopup(item, {}).resolve()
                if (result) {
                    sendItemToActor(item.actor?.id, actorUuid, item.id, result.quantity, result.newStack)
                }
                return []
            }
        }

        return await originCall.call(this, event, data);
    }
});

function hasPermissions(item) {
    return 3 === item?.ownership[game.user.id] || game.user.isGM;
}

class MoveLootPopup extends FormApplication {
    #resolve = null;

    constructor(object, options) {
        super(object, options)
    }

    async resolve() {
        if (this.object.quantity <= 1) {
            return {
                quantity: this.object.quantity,
                newStack: false,
            };
        }

        this.render(true);
        return new Promise((resolve) => {
            this.#resolve = resolve;
        });
    }

    async getData() {
        const [prompt, buttonLabel] = ['PF2E.loot.MoveLootMessage', 'PF2E.loot.MoveLoot']
        return {
            ...(await super.getData()),
            quantity: {
                default: this.object.quantity,
                max: this.object.quantity,
            },
            newStack: false,
            lockStack: false,
            prompt,
            buttonLabel,
        }
    }

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            id: 'MoveLootPopup',
            classes: [],
            title: game.i18n.localize('PF2E.loot.MoveLootPopupTitle'),
            template: `modules/${moduleName}/templates/move-loot.hbs`,
            width: 'auto',
            quantity: {
                default: 1,
                max: 1,
            },
            newStack: false,
            lockStack: false,
            isPurchase: false,
        }
    }

    async _updateObject(_event, formData) {
        this.#resolve?.({
            quantity: formData.quantity ?? 1,
            newStack: formData.newStack,
        });
        this.resolve = null;
    }

    async close(options) {
        this.#resolve?.(null);
        return super.close(options);
    }
}

Hooks.on('createItem', (item) => {
    if (!item?.actor) {
        return
    }
    if (!item?.actor?.isOfType("party")) {
        return
    }
    let max = game.settings.get(moduleName, "maxEncumbrance");
    if (max && max > 0 && game.settings.get(moduleName, "maxEncumbranceBehaviour") === "notify") {
        if (parseFloat(`${item.actor.inventory.bulk.value.normal}.${item.actor.inventory.bulk.value.light}`) > max) {
            ui.notifications.info("Party Stash is Encumbered");
        }
    }
});

Hooks.on('updateItem', (item, data) => {
    if (!item?.actor) {
        return
    }
    if (!item?.actor?.isOfType("party")) {
        return
    }
    if (!data?.system?.quantity) {
        return
    }
    let max = game.settings.get(moduleName, "maxEncumbrance");
    if (max && max > 0 && game.settings.get(moduleName, "maxEncumbranceBehaviour") === "notify") {
        if (parseFloat(`${item.actor.inventory.bulk.value.normal}.${item.actor.inventory.bulk.value.light}`) > max) {
            ui.notifications.info("Party Stash is Encumbered");
        }
    }
});

Hooks.on('preCreateItem', (item) => {
    if (!item?.actor) {
        return
    }
    if (!item?.actor?.isOfType("party")) {
        return
    }
    let max = game.settings.get(moduleName, "maxEncumbrance");
    if (max && max > 0 && game.settings.get(moduleName, "maxEncumbranceBehaviour") === "notadd") {
        if (parseFloat(`${item.actor.inventory.bulk.value.normal}.${item.actor.inventory.bulk.value.light}`) > max) {
            ui.notifications.info("Party Stash is Encumbered");
            return false;
        }
    }
});

Hooks.on('preUpdateItem', (item, data) => {
    if (!item?.actor) {
        return
    }
    if (!item?.actor?.isOfType("party")) {
        return
    }
    if (!data?.system?.quantity) {
        return
    }
    let max = game.settings.get(moduleName, "maxEncumbrance");
    if (max && max > 0 && game.settings.get(moduleName, "maxEncumbranceBehaviour") === "notadd") {
        if (parseFloat(`${item.actor.inventory.bulk.value.normal}.${item.actor.inventory.bulk.value.light}`) > max) {
            ui.notifications.info("Party Stash is Encumbered");
            return false;
        }
    }
});
