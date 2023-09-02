const moduleName = "pf2e-party-sheet-helper";

const gradient = [
    [0,  [255,0,0]],
    [50, [204,204,0]],
    [100,[0,128,0]],
];
const sliderWidth = 500;
let canvasDistance = 100;

const clownCarCoords = [
    {x: 0, y: -1},
    {x: 0, y: 1},
    {x: -1, y: 0},
    {x: 1, y: 0},
    {x: -1, y: -1},
    {x: 1, y: -1},
    {x: -1, y: 1},
    {x: 1, y: 1},
    {x: 0, y: -2},
    {x: 0, y: 2},
    {x: -2, y: 0},
    {x: 2, y: 0},
    {x: -1, y: -2},
    {x: 1, y: -2},
    {x: -1, y: 2},
    {x: 1, y: 2},
    {x: -2, y: -1},
    {x: 2, y: -1},
    {x: -2, y: 1},
    {x: 2, y: 1},
    {x: -2, y: -2},
    {x: 2, y: -2},
    {x: -2, y: 2},
    {x: 2, y: 2},
]

function healthStatuses() {
    const list = game.settings.get(moduleName, "healthStatus").split(',').map(a=>a.trim());
    if (list.length >= 2) {
        const perStage = Math.round(10000/(list.length-1))/100;
        const stages = list.map((el, idx) => {
            return {label: el, percent: idx*perStage};
        });
        stages[stages.length-1].percent = 100;
        return stages;
    }

    return [];
};

function calculateColor(percent) {
    if (percent === 0) return gradient[0][1];

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
        label = statuses.find((e) => percent <= e.percent).label;
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

    canvasDistance = canvas.dimensions?.size ?? 100
});

Hooks.on('renderTokenHUD', function(tokenHud, html, data) {
    if (!game.settings.get(moduleName, "useCircleClownCar")) return;
    const token = canvas.scene?.tokens.get(data._id ?? "")?.object;
    if (!token?.actor?.isOfType("party")) return;

    const clownCar = html.find('.control-icon[data-action="clown-car"]');
    if (clownCar.length === 0) {return};
    if (clownCar.attr('class').split(' ').includes('psh')) return;

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

            const choices = {};
            addChoices(token, actor, choices);

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
                            } else if (value === 'circle') {
                                circleDepositTokens(token, actor, scene);
                            } else if (value === 'freeSpace') {
                                freeSpaceDepositTokens(token, actor, scene);
                            } else if (value === 'origin') {
                                originDepositTokens(token, actor, scene);
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

    clownCar.replaceWith(newDiv);
});

function addChoices(token, actor, choices) {
    if (game.settings.settings.has('z-scatter.snapTokens') && game.settings.get('z-scatter', 'snapTokens')) {
        choices['zScatter'] = 'Z-Scatter Method'
    }

    const coods = actor.members.slice(0,24).map((m, index) => {return{
        x: token.center.x + (clownCarCoords[index].x) * canvasDistance,
        y: token.center.y + (clownCarCoords[index].y) * canvasDistance,
    }});
    if (actor.members.length > 24) {
        coods.push(...actor.members.slice(24).map((m, index) => {return{
            x: token.center.x + (index + 3) * canvasDistance,
            y: token.center.y,
        }}));
    }
    const hasCollision = coods.some(c=> {
        return CONFIG.Canvas.polygonBackends.move.testCollision(token.center, c, { type: 'move', mode: 'any' });
    });
    if (!hasCollision) {
        choices['circle'] = 'Circle Method';
    }

    if (actor.members.length <= 24) {
        const freeSpace =  clownCarCoords.map((m, index) => {return{
            x: token.center.x + (clownCarCoords[index].x) * canvasDistance,
            y: token.center.y + (clownCarCoords[index].y) * canvasDistance,
        }}).filter(c=>!CONFIG.Canvas.polygonBackends.move.testCollision(token.center, c, { type: 'move', mode: 'any' }))
        console.log(freeSpace);
        if (freeSpace.length >= actor.members.length) {
            choices['freeSpace'] = 'Free Space';
        }
    }

    const originCoors = actor.members.map((m, index) => {return{
        x: token.center.x + (index + 1) * canvasDistance,
        y: token.center.y,
    }});
    const originCollision = originCoors.some(c=> {
        return CONFIG.Canvas.polygonBackends.move.testCollision(token.center, c, { type: 'move', mode: 'any' });
    });
    if (!originCollision) {
        choices['origin'] = 'Origin Method';
    }
}

async function originDepositTokens(token, actor, scene) {
    const newTokens = (
        await Promise.all(
            actor.members.map((m, index) =>
                m.getTokenDocument({
                    x: token.document.x + (index + 1) * canvasDistance,
                    y: token.document.y,
                })
            )
        )
    ).map((t) => t.toObject());
    await scene.createEmbeddedDocuments("Token", newTokens);

    canvas.tokens.hud.render();
}

async function circleDepositTokens(token, actor, scene) {
    const newTokens = (await Promise.all(
        actor.members.slice(0,24).map((m, index) =>
            m.getTokenDocument({
                x: token.document.x + (clownCarCoords[index].x) * canvasDistance,
                y: token.document.y + (clownCarCoords[index].y) * canvasDistance,
            })
        )
    )).map((t) => t.toObject());
    if (actor.members.length > 24) {
        newTokens.push(...(
            await Promise.all(
                actor.members.slice(24).map((m, index) =>
                    m.getTokenDocument({
                        x: token.document.x + (index + 3) * canvasDistance,
                        y: token.document.y,
                    })
                )
            )
        ).map((t) => t.toObject()));
    }
    await scene.createEmbeddedDocuments("Token", newTokens);

    canvas.tokens.hud.render();
}

async function freeSpaceDepositTokens(token, actor, scene) {
    const coods = clownCarCoords.map((m, index) => {return{
        x: token.center.x + (clownCarCoords[index].x) * canvasDistance,
        y: token.center.y + (clownCarCoords[index].y) * canvasDistance,
    }}).filter(c=>!CONFIG.Canvas.polygonBackends.move.testCollision(token.center, c, { type: 'move', mode: 'any' }))
    .map(a=>{ return {x: a.x - canvasDistance/2, y: a.y - canvasDistance/2} });

    const newTokens = (await Promise.all(
        actor.members.map((m, index) => m.getTokenDocument(coods[index]))
    )).map((t) => t.toObject());

    await scene.createEmbeddedDocuments("Token", newTokens);

    canvas.tokens.hud.render();
}

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

Hooks.on('renderPartySheetPF2e', function(partySheet, html, data) {
    html.find('.skills > .tag-light.tooltipstered').click(async (event) => {
        const skill = $(event.currentTarget).data().slug;
        const isSecret = event.shiftKey;

        const { dc } = await Dialog.wait({
            title:"DC of skill",
            content: `
                <h3>DC of check</h3>
                <input id="skill-dc" type="number" min="0" value=10 />
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

        ChatMessage.create({
            type: CONST.CHAT_MESSAGE_TYPES.OOC,
            content: `@Check[type:${skill}|dc:${dc}${isSecret?'|traits:secret':''}]{${skill.capitalize()} Check}`
        });
    });

    if (game.settings.get(moduleName, "useHealthStatus")) {
        const statuses = healthStatuses();
        if (statuses.length) {
            partySheet.actor.members.forEach((actor) => {
                healthEstimateForActor(actor, html, statuses);
            });
        }
    };

    const encumbranceHtml = `<div class="encumbrance">
        <img src="systems/pf2e/icons/equipment/adventuring-gear/backpack.webp" alt="Encumbrance">
        <span class="encumbrance-bar" style="width:100%"></span>
        <div class="encumbrance-label">
            <span>Carried Bulk: ${partySheet.actor.inventory.bulk.value.normal}, ${partySheet.actor.inventory.bulk.value.light}L</span>
        </div>
        <span class="bar-bg"></span>
    </div>`


    html.find(`div[data-tab="inventory"]`).find(`.inventory`).append(encumbranceHtml);

});