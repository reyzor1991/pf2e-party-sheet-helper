class AchievementForm extends FormApplication {

    constructor(options) {
        super({});
        this.actor = options.actor;
    }

    getData() {
        return foundry.utils.mergeObject(super.getData(), {
        });
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: "Achievements Config",
            id: `${moduleName}-achievements-configure`,
            classes: [moduleName],
            template: "modules/pf2e-party-sheet-helper/templates/achievements.hbs",
            width: 500,
            height: "auto",
            closeOnSubmit: true,
            submitOnChange: false,
            resizable: true,
        });
    }

    async _updateObject(_event, updateData) {
        if (!updateData?.name || !updateData["texture.src"]) { return }

        let data = this.actor.getFlag(moduleName, "achievements") ?? [];
        data.push({
            text: updateData.name,
            img: updateData["texture.src"],
        });

        this.actor.setFlag(moduleName, "achievements", data)
    }
}

Hooks.on('getPartySheetPF2eHeaderButtons', function(partySheet, buttons) {
    if (!isGM()) {return;}
    buttons.unshift({
        label: "Achievements",
        icon: "fa fa-trophy",
        class: `${moduleName}-achievements`,
        onclick: () => {
            (new AchievementForm({actor:partySheet.actor})).render(true);
        }
    });
});

Hooks.on('renderPartySheetPF2e', function(partySheet, html) {
    if (!game.settings.get(moduleName, "showAchievements")) {return}

    let data = partySheet.actor.getFlag(moduleName, "achievements") ?? [];
    let content = data.sort((a,b) => a.text.localeCompare(b.text)).map((a,idx)=>`<div class="portrait" data-tooltip="${a.text}" data-index=${idx}>${isGM()?'<i class="fas fa-times close"></i>' : ''}<img src="${a.img}"><label>${a.text}</label></div>`).join("")

    html.find('.sub-nav').append('<a data-tab="achievements" class="">Achievements</a>');
    html.find('.container').append(`<div class="tab" data-tab="achievements" data-region="achievements"><div class="achievements content">${content}</div></div>`);

    html.find('.achievements .close').on("click", async function(event) {
        const target = $(event.currentTarget);
        const dataIdx = target.parent().data().index;

        let data = partySheet.actor.getFlag(moduleName, "achievements") ?? [];
        data.splice(dataIdx, 1);

        partySheet.actor.setFlag(moduleName, "achievements", data);
    })
});
