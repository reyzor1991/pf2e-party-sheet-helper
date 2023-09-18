const moduleName = "pf2e-party-sheet-helper";

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

const gradient = [
    [0,  [255,0,0]],
    [50, [204,204,0]],
    [100,[0,128,0]],
];
const sliderWidth = 500;

function healthStatuses() {
    const list = game.settings.get(moduleName, "healthStatus").split(',').map(a=>a.trim());
    if (list.length >= 2) {
        const perStage = Math.round(10000/(list.length-2))/100;
        const stages = [{label: list[0], percent: {from: 0, to: 0}}]
        stages.push(...list.slice(1, -1).map((el, idx) => {
            return {label: el, percent: {from: idx*perStage, to: (idx+1)*perStage}};
        }));
        stages.push({label: list[list.length-1], percent: {from: 100, to: 100}})
        return stages;
    }

    return [];
};

function calculateColor(percent) {
    if (percent === 0 || isNaN(percent)) return gradient[0][1];

    let colorRange = []
    for (let i = 0; i < gradient.length; i++) {
        if (percent<=gradient[i][0]) {
            colorRange = [i-1, i]
            break;
        }
    }

    //Get the two closest colors
    const firstcolor = gradient[colorRange[0]][1];
    const secondcolor = gradient[colorRange[1]][1];


    //Calculate ratio between the two closest colors
    const firstcolor_x = sliderWidth*(gradient[colorRange[0]][0]/100);
    const secondcolor_x = sliderWidth*(gradient[colorRange[1]][0]/100)-firstcolor_x;

    const slider_x = sliderWidth*(percent/100)-firstcolor_x;
    const ratio = slider_x/secondcolor_x

    return pickHex( secondcolor,firstcolor, ratio );
}

function pickHex(color1, color2, weight) {
    var w1 = weight;
    var w2 = 1 - w1;
    var rgb = [Math.round(color1[0] * w1 + color2[0] * w2),
        Math.round(color1[1] * w1 + color2[1] * w2),
        Math.round(color1[2] * w1 + color2[2] * w2)];
    return rgb;
}

function healthEstimateForActor(actor, html, statuses) {
    const percent = (actor.system.attributes.hp.value / actor.system.attributes.hp.max) * 100;
    let color = calculateColor(percent);
    let label = '?';
    if (percent === 0 ) {
        label = statuses[0].label
    } else if (percent === 100 ) {
        label = statuses[statuses.length-1].label
    } else {
        label = statuses.find((e) => percent <= e.percent.to && percent>= e.percent.from)?.label ?? 'Undefined';
    };

    const overHpBar = html.find(`div[data-tab="overview"]`).find(`.member[data-actor-uuid="${actor.uuid}"]`).find('.health-bar');
    overHpBar.find('span').text(`${label}`);
    overHpBar.find('.bar').css({'background-color': `rgb(${color[0]},${color[1]},${color[2]})`});

    const expHpBar = html.find(`div[data-tab="exploration"]`).find(`.content[data-actor-uuid="${actor.uuid}"]`).parent().find('.health-bar');
    expHpBar.find('span').text(`${label}`);
    expHpBar.find('.bar').css({'background-color': `rgb(${color[0]},${color[1]},${color[2]})`});
};

Hooks.on('init', function(partySheet, html, data) {
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
    game.settings.register(moduleName, "useCircleClownCar", {
        name: "When deposit PC Tokens - use circle method",
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
});

Hooks.on('renderTokenHUD', function(tokenHud, html, data) {
    if (!game.settings.get(moduleName, "useCircleClownCar")) return;
    const token = canvas.scene?.tokens.get(data._id ?? "")?.object;
    if (!token?.actor?.isOfType("party")) return;

    const clownCar = html.find('.control-icon[data-action="clown-car"]');
    if (clownCar.length === 0) {return};
    clownCar.addClass("hidden");

    const { actor, scene } = token;
    const el = (()  => {
        const imgElement = document.createElement("img");
        imgElement.src = "systems/pf2e/icons/other/enter-exit.svg";
        const willRetrieve = actor.members.some((m) => m.getActiveTokens(true, true).length > 0);
        imgElement.className = willRetrieve ? "retrieve" : "deposit";
        imgElement.title = game.i18n.localize(
            willRetrieve ? "PF2E.Actor.Party.ClownCar.Retrieve" : "PF2E.Actor.Party.ClownCar.Deposit"
        );

        return imgElement;
    })();

    const newDiv = document.createElement("div");
    newDiv.classList.add('control-icon', 'psh');
    newDiv.setAttribute('data-action', "clown-car");
    newDiv.appendChild(el);

    newDiv.addEventListener("click", async () => {
        const memberTokensIds = new Set(
            actor.members.flatMap((m) => m.getActiveTokens(true, true)).map((t) => t.id)
        );
        if (memberTokensIds.size === 0) {

            let onlyOrigin = true;
            const choices = {'origin': 'Origin Method'};
            if (game.settings.settings.has('z-scatter.snapTokens') && game.settings.get('z-scatter', 'snapTokens')) {
                choices['zScatter'] = 'Z-Scatter Method';
                onlyOrigin = false;
            }

            if (onlyOrigin) {
                clownCar.click();
                return;
            }
            const content = await renderTemplate("./modules/pf2e-party-sheet-helper/templates/clown-car-choise.hbs", {choices});
            new Dialog({
                title: "Choice method of deposit PCs",
                content,
                buttons: {
                    ok: {
                        label: "<span class='pf2-icon'>1</span> Drop",
                        callback: async (html) => {
                            const value = html.find('select[name="drop-list"]').val();
                            if (value === 'zScatter') {
                                zScatterDepositTokens(token, actor, scene);
                            } else if (value === 'origin') {
                                clownCar.click();
                                canvas.tokens.hud.render();
                            }
                        }
                    }
                },
            }).render(true);
        } else {
            await scene.deleteEmbeddedDocuments("Token", [...memberTokensIds]);
            canvas.tokens.hud.render();
        }
    });

    $( newDiv ).insertBefore( clownCar );
})

async function zScatterDepositTokens(token, actor, scene) {
    const newTokens = (await Promise.all(
        actor.members.map((m, index) =>
            m.getTokenDocument({
                x: token.document.x,
                y: token.document.y,
            })
        )
    )).map((t) => t.toObject());

    await scene.createEmbeddedDocuments("Token", newTokens);
    canvas.tokens.hud.render();
}

Hooks.on('renderSidebarTab', function(tab, html, data) {
    if (tab.id != 'actors') {return;}

    const header = html.find('.directory-list').find('.party-list').find('header');
    const party = game.actors.get(header.data().documentId)
    const row = header.find('.noborder');
    if (row.find('.create-combat').length === 0) {
        const newBtn = `<a class="create-combat left-control" data-tooltip="Create Combat"><i class="fas fa-swords"></i></a>`;
        $( newBtn ).insertBefore( row.find('span') );

        $(row.find('.create-combat')).on("click", async function(el) {
            el.stopPropagation();
            if (game.combat) {ui.notifications.info("Combat already exists");return}

            await Combat.create({scene: canvas.scene.id, active: true});
            const tokens = party.members.map(m=>m.getActiveTokens(true, true)).flat();
            if (tokens.length > 0) {
                await game.combat.createEmbeddedDocuments( "Combatant", tokens.map(t=>{return {tokenId: t.id} } ))

                ui.notifications.info("Combat was created");
            }
        });
    }
})

Hooks.on('renderPartySheetPF2e', function(partySheet, html, data) {
    const levels = partySheet.actor.members.map(a=>a.level)
    const defDC = (dcByLevel.get(Math.round(levels.reduce((a, b) => a + b, 0)/levels.length)) ?? 50);

    html.find('.skills > .tag-light.tooltipstered').click(async (event) => {
        const skill = $(event.currentTarget).data().slug;
        const isSecret = (event.ctrlKey || event.metaKey);

        const { dc } = await Dialog.wait({
            title:"DC of skill",
            content: `
                <h3>DC of check</h3>
                <input id="skill-dc" type="number" min="0" value=${defDC} />
            `,
            buttons: {
                    ok: {
                        label: "Create DC Template",
                        icon: "<i class='fa-solid fa-magic'></i>",
                        callback: (html) => { return { dc: parseInt(html[0].querySelector("#skill-dc").value) } }
                    },
                    cancel: {
                        label: "Cancel",
                        icon: "<i class='fa-solid fa-ban'></i>",
                    }
            },
            default: "ok"
        });
        if (dc === undefined) { return; }


        if (event.shiftKey) {
            navigator.clipboard.writeText(`@Check[type:${skill}|dc:${dc}${isSecret?'|traits:secret':''}]{${skill.capitalize()} Check}`);
            ui.notifications.info("Copied the text of check");
        } else {
            ChatMessage.create({
                type: CONST.CHAT_MESSAGE_TYPES.OOC,
                content: `@Check[type:${skill}|dc:${dc}${isSecret?'|traits:secret':''}]{${skill.capitalize()} Check}`
            });
        }

    });

    if (game.settings.get(moduleName, "useHealthStatus")) {
        const statuses = healthStatuses();
        if (statuses.length) {
            partySheet.actor.members.forEach((actor) => {
                healthEstimateForActor(actor, html, statuses);
            });
        }
    };

    if (game.settings.get(moduleName, "hideWealthFromPC") && !game.user.isGM) {
        html.find('.inventory-members').find('.sub-data > .value').addClass("hidden");

        $(html.find('.inventory-members').find('.summary-data').children()[1]).css({ display: "none" })
    }

    const expBnt = `<div><a class="travel-duration" data-document-id="${partySheet.actor.id}" >Calculate Travel duration   <i class="far fa-clock"></i></a></div>`;
    html.find('.exploration-members').find('.summary-data').append(expBnt)

    $(html.find('.travel-duration')).on("click", async function(el) {
        el.stopPropagation();
        const party = game.actors.get($(el.currentTarget).data().documentId)

        const members = party.members.filter(a=>!a.isOfType("familiar")).filter(a=>!["eidolon", 'animal-companion'].includes(a.class?.slug))
        if (members.length > 0) {
            game.pf2e.gm.launchTravelSheet(members);
        }
    });

});