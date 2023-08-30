const moduleName = "pf2e-party-sheet-helper";

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

function healthEstimateForActor(actor, html, statuses) {
    const percent = (actor.system.attributes.hp.value / actor.system.attributes.hp.max) * 100;
    const label = statuses.findLast((e) => percent >= e.percent).label;

    html.find(`div[data-tab="overview"]`).find(`.member[data-actor-uuid="${actor.uuid}"]`).find('.health-bar span').text(`${label}`);
    html.find(`div[data-tab="exploration"]`).find(`.content[data-actor-uuid="${actor.uuid}"]`).parent().find('.health-bar span').text(`${label}`);
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
    }
});