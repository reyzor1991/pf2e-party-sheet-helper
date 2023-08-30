const moduleName = "pf2e-party-sheet-helper";

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
});