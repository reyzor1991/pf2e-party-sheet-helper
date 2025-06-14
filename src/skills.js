Hooks.on('renderPartySheetPF2e', function (partySheet, html) {
    if (!game.settings.get(moduleName, "skills") || !game.user.isGM) {
        return
    }

    let data = foundry.utils.deepClone(partySheet.actor.getFlag(moduleName, "skills") ?? {});

    let values = Object.entries(data)
        .map(([key, d]) => {
            let label = d.label === "perception"
                ? game.i18n.localize("PF2E.PerceptionLabel")
                : d.label
                    ? game.i18n.localize("PF2E.Skill." + d.label?.titleCase())
                    : 'Unknown'

            return `<tr>
                <td>${d.name}</td>
                <td>${label}</td>
                <td>${d.proficiency?.titleCase() || 'Unknown'}</td>
                <td>${d.value}</td>
                <td>${new Date(d.timestamp).toLocaleString()}</td>
                <td data-id="${d.id}" class="link-to-message"><i class="fas fa-comments"></i></td>
                <td data-key="${key}" class="delete-row"><i class="fas fa-close"></i></td>
            </tr>`
        })
        .join('')

    const content = `
        <section class="tab sidebar-tab directory flexcol">
            <table id="sub-skills">
                <tr>
                    <th>Name</th>
                    <th>Skill</th>
                    <th>Proficiency of skill</th>
                    <th>Value</th>
                    <th>Date</th>
                </tr>
                ${values}
            </table>
        </section>
    `

    html.find('.sub-nav:not(.sub-sub-nav)').append('<a data-tab="skills" class="">Skills</a>')
    html.find('.container').append(`<div class="tab" data-tab="skills" data-region="skills"><div class="content">${content}</div></div>`)

    $(".link-to-message").on("click", function () {
        $(document).find(`#chat-log li[data-message-id="${this?.dataset?.id}"]`)[0]?.scrollIntoView({block: "start"});
    });
    $(".delete-row").on("click", async function () {
        await game.actors.party.unsetFlag('pf2e-party-sheet-helper', `skills.${this?.dataset?.key}`)
    });

});


Hooks.on("createChatMessage", async (message) => {
    if (!game.settings.get(moduleName, "skills") && !isGM()) {
        return
    }
    if (message.flags?.pf2e?.context?.domains?.includes('initiative')) {
        return
    }
    if (
        !message.flags?.pf2e?.context?.domains?.includes('deception-check')
        && !message.flags?.pf2e?.context?.domains?.includes('perception-check')
        && !message.flags?.pf2e?.context?.domains?.includes('stealth-check')
    ) {
        return
    }

    let value = Number.isNumeric(message.content) ? Number(message.content) : 0;

    let label = message.flags.pf2e.modifierName

    let proficiency = message.flags.pf2e.context.options.find(o => o.startsWith("proficiency:"))?.split(":")?.[1]

    game.actors.filter(a => a.isOfType('party')).filter(p => p.members.find(m => m === message.actor))
        .forEach((element, index) => {
            element.setFlag(
                moduleName,
                'skills',
                {
                    [`${message.actor.id}-${message.flags.pf2e.modifierName}`]: {
                        'name': message.actor.name,
                        label,
                        value,
                        proficiency,
                        timestamp: message.timestamp,
                        id: message.id
                    }
                }
            )
        });
});
