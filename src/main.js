const moduleName = "pf2e-party-sheet-helper";

const gradient = [
    [0,  [255,0,0]],
    [50, [204,204,0]],
    [100,[0,128,0]],
];
const sliderWidth = 500;

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
});

Hooks.on('renderPartySheetPF2e', function(partySheet, html, data) {
    html.find('.skills > .tag-light.tooltipstered').click(async (event) => {
        const skill = $(event.currentTarget).data().slug;

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
            content: `@Check[type:${skill}|dc:${dc}|traits:secret]{${skill.capitalize()} Check}`
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