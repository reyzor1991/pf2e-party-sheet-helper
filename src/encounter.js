function minusPlusValue(value) {
    return value === 0 ? "0" : value > 0 ? `+${value}` : `-${value}`;
}

function createSkillSection(skill) {
    return `
    <span class="tag-light" data-rank="${skill.rank}">${skill.label} ${minusPlusValue(skill.mod)}</span>
    `;
}

function createSection(actor) {
    let spells = actor.spellcasting.regular.map(r=>{return{value:r.statistic.dc.value,name:r.name}})
        .map(s=>`<section class="ac score" data-tooltip="${s.name}"><label>Spell DC</label><span class="value">${s.value}</span></section>`)
        .join("")

    return `
        <section class="member ">
            <div class="portrait">
                <div>${actor.name}</div>
                <div><img src="${actor.img}"></div>
            </div>
            <div class="data">
                <div class="main-stats">
                    <section class="ac score">
                        <label>AC</label>
                        <span class="value">${actor.armorClass.value}</span>
                    </section>
                    <section class="ac score">
                        <label>Class DC</label>
                        <span class="value">${actor.classDC?.dc.value || ""}</span>
                    </section>
                    <section class="ac score">
                        <label class="small">Class Spell DC</label>
                        <span class="value">${actor.attributes?.classOrSpellDC?.value || ""}</span>
                    </section>
                    ${spells}
                    <section class="saving-throws">
                        <span class="score"><label>Fort</label>${minusPlusValue(actor.saves.fortitude.mod)}</span>
                        <span class="score"><label>Ref</label>${minusPlusValue(actor.saves.reflex.mod)}</span>
                        <span class="score"><label>Will</label>${minusPlusValue(actor.saves.will.mod)}</span>
                    </section>
                </div>
                <div class="skills">
                    ${Object.values(actor.skills).map(skill => createSkillSection(skill)).join("")}
                </div>
            </div>
        </section>
    `
}

Hooks.on('renderPartySheetPF2e', function (partySheet, html) {
    if (!game.settings.get(moduleName, "showEncounterData") || !game.user.isGM) {
        return
    }

    const content = partySheet.actor.members.map(m => createSection(m)).join("")

    html.find('.sub-nav:not(.sub-sub-nav)').append('<a data-tab="encounter" class="">Encounter</a>')
    html.find('.container').append(`<div class="tab" data-tab="encounter" data-region="encounter"><div class="content">${content}</div></div>`)
});