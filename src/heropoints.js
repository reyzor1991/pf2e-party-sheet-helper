Hooks.on('renderCharacterSheetPF2e', function(sheet, html) {
    if (!game.settings.get(moduleName, "shareHero")) {return}
    let activeParty = sheet.actor.parties.first();
    if (!activeParty) {return}
    let hp = activeParty.getFlag(moduleName, 'heropoints');
    if (!hp?.value) {return}

    let f = html.find('.char-header .char-details')
    f.append(`<i class="fa-solid fa-hand-fist party-hero-points" title="Get Party Hero Points">`)

    $(html).find('.party-hero-points').click(async (event) => {
        if (!hp?.value) {
            ui.notifications.info("There are no Party Hero Points");
            return;
        }
        sheet.actor.update({ "system.resources.heroPoints.value": Math.min(sheet.actor.heroPoints.value + 1, sheet.actor.heroPoints.max) });
        activeParty.setFlag(moduleName, 'heropoints', {value: Math.max(hp.value - 1, 0)})

        ui.notifications.info("Hero Point was added");
    });
});

Hooks.on('renderPartySheetPF2e', function(partySheet, html) {
    if (!isGM()) {return;}

    let partyHP = partySheet.actor.getFlag(moduleName, 'heropoints') ?? {max:0, value:0};

    let points = '';
    for (let i = 0; i < partyHP.max; i++) {
        if (partyHP.value > i) {
            points += '<img src="systems/pf2e/dice/basic/heads.webp" />'
        } else {
            points += '<span class="empty"></span>'
        }
    }

    let newBlock = `<section class="section-party-hero-points">
        <div class="data">
            <div class="party-hp"><i class="fa-solid fa-hand-fist sync-hero-points" title="Sync Hero Points"></i></div>
            <a class="party-hero-points" data-action="adjust-hero-points">
                ${points}
            </a>
        </div>
    </section>`

    let summary = html.find('.container [data-tab="overview"] .content .summary')
    $(newBlock).insertAfter(summary);


    $(html).find('.sync-hero-points').click(async (event) => {
        let settingHeroPoints = game.settings.get(moduleName, "shareHero") ?? 0;
        partySheet.actor.setFlag(moduleName, 'heropoints', {max:settingHeroPoints, value:settingHeroPoints})
    });

    $(html).find('.party-hero-points').click(async (event) => {
        const value = Math.min(partyHP.value + 1, partyHP.max)
        partySheet.actor.setFlag(moduleName, 'heropoints', {value})
    });

    $(html).find('.party-hero-points').contextmenu(async (event) => {
        const value = Math.max(partyHP.value - 1, 0)
        partySheet.actor.setFlag(moduleName, 'heropoints', {value})
    });

});