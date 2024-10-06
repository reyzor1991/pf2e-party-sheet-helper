Hooks.on('renderPartySheetPF2e', function(partySheet, html) {
    if (!game.user.isGM) {return;}
    if (!game.settings.get(moduleName, "showAfflictions")) {return}

    let actors = game.actors.party.members.map(a=>{
        let affs = a.itemTypes.effect.filter(e=>e.flags['pseudo-afflictions'] || e.name?.includes('Affliction')).map(aff=>{

            let total = "-";
            let stage = "-";

            if (game.pseudoafflictions) {
                total = game.pseudoafflictions.remaining(aff)
                stage = game.pseudoafflictions.stageRemaining(aff)
            }


            return `
                <div class="affliction-row">
                    <div class="col"><img src="${aff.img}" /></div>
                    <div class="name col"><a>${aff.name}</a></div>
                    <div class="col"><a>${total}</a></div>
                    <div class="col"><a>${stage}</a></div>
                </div>
            `
        }).join('')

        return `
            <section class="member">
            <div class="portrait">
                <header>
                    <div class="name"><a>${a.name}</a></div>
                </header>
                <a><img src="${a.img}"></a>
            </div>
            <div class="data">
                <section class="effects">
                    <div class="affliction-row">
                        <div class="col"></div>
                        <div class="name col">Name</div>
                        <div class="col"><a>Total remaining</a></div>
                        <div class="col"><a>Next stage</a></div>
                    </div>
                    ${affs}
                </section>
            </div>
        </section>
        `
    }).join('');


    html.find('.sub-nav:not(.sub-sub-nav)').append('<a data-tab="afflictions" class="">Afflictions</a>');
    html.find('.container').append(`<div class="tab" data-tab="afflictions" data-region="afflictions"><div class="afflictions content">${actors}</div></div>`);
});