class AchievementForm extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

    static DEFAULT_OPTIONS = {
        tag: "form",
        id: `${moduleName}-achievements-configure`,
        classes: [moduleName],
        window: {title: "Achievements Config", resizable: true},
        position: {width: 500},
        actions: {},
        form: {
            handler: this.formHandler,
            closeOnSubmit: true,
            submitOnChange: false,
        },
    };

    static PARTS = {
        main: {
            template: "modules/pf2e-party-sheet-helper/templates/achievements.hbs",
            root: true,
        },
    };

    constructor(options) {
        super({});
        this.achievement = options.achievement;
        this.index = options.index;

        this.actor = options.actor;
    }

    async _prepareContext() {
        if (this.achievement) {
            return {
                achievement: this.achievement
            };
        } else {
            let pcs = this.actor.members.filter(m => m.isOfType('character')).reduce((obj, row) => {
                obj[row.id] = row.name
                return obj;
            }, {});
            pcs[this.actor.id] = this.actor.name;

            return {
                pcs
            };
        }
    }

    static async formHandler(_event, _form, formData) {
        const updateData = {
            ...formData.object,
            name: formData.object.name?.trim() ?? "",
            description: formData.object.description ?? "",
            "texture.src": formData.object["texture.src"]?.trim() ?? "",
            owner: formData.object.owner ? [formData.object.owner].flat() : [],
        };

        if (!updateData?.name || !updateData["texture.src"]) {
            ui.notifications.warn("Name and image fields are missing");
            return
        }

        if (this.achievement) {
            let data = this.actor.getFlag(moduleName, "achievements") ?? [];
            data[this.index] = {
                text: updateData.name,
                description: updateData.description,
                img: updateData["texture.src"],
                owner: this.achievement.owner
            }
            await this.actor.setFlag(moduleName, "achievements", data)
        } else {
            let data = this.actor.getFlag(moduleName, "achievements") ?? [];
            let owners = updateData.owner || []
            if (!owners.length) {
                owners.push(this.actor.id);
            }

            for (let owner of owners) {
                data.push({
                    text: updateData.name,
                    description: updateData.description,
                    img: updateData["texture.src"],
                    owner,
                });
            }

            await this.actor.setFlag(moduleName, "achievements", data)
        }
    }
}

Hooks.on('getPartySheetPF2eHeaderButtons', function (partySheet, buttons) {
    if (!game.user.isGM) {
        return;
    }
    buttons.unshift({
        label: "",
        icon: "fa fa-trophy",
        class: `${moduleName}-achievements`,
        onclick: () => {
            (new AchievementForm({actor: partySheet.actor})).render(true);
        }
    });
});

function htmlAchievements(party, html) {
    let data = foundry.utils.deepClone(party.getFlag(moduleName, "achievements") ?? []);
    data = data.reduce((obj, row, index) => {
        row.idx = index
        obj[row.owner] ??= []
        obj[row.owner].push(row);
        return obj;
    }, {})
    data[party.id] = [...(data[undefined] || []), ...(data[party.id] || [])]
    delete data[undefined];

    let navs = Object.keys(data)
        .sort((a, b) => a === party.id ? -1 : 1)
        .map(k => `<a data-tab="${k}">${game.actors.get(k)?.name ?? 'Deleted actor'}</a>`)
    navs = navs.length === 1
        ? ""
        : `<nav class="sub-nav sub-sub-nav">
                ${navs.join("")}
            </nav>`

    let insideData = Object.keys(data).length === 1
        ? `<div class="tab" data-tab="achievements" data-region="achievements">
            <div class="achievements content">${createAchievementImages(data[party.id])}</div>
            </div>`
        : `<div class="tab" data-tab="achievements" data-region="achievements">${navs}
                <section style="height: 100%;">
                     ${Object.keys(data).map(k => `<div class="tab" data-tab="${k}" data-region="s-achievements">
                <div class="achievements content">${createAchievementImages(data[k])}</div>
            </div>`).join("")}   
                </section>
            </div>`

    html.find('.sub-nav:not(.sub-sub-nav)').append('<a data-tab="achievements" class="">Achievements</a>');
    html.find('.container')
        .append(insideData);

    html.find('.achievements .close').on("click", async function (event) {
        const target = $(event.currentTarget);
        const dataIdx = target.parent().data().index;

        let data = party.getFlag(moduleName, "achievements") ?? [];
        data.splice(dataIdx, 1);

        await party.setFlag(moduleName, "achievements", data);
    })

    html.find('.achievements .edit').on("click", async function (event) {
        const target = $(event.currentTarget);
        const index = target.parent().data().index;

        let achievement = party.getFlag(moduleName, "achievements")[index];

        new AchievementForm({
            achievement,
            index,
            actor: party
        }).render(true)
    })

    html.on('click', '[data-region="achievements"] > .sub-nav > a', (event) => {
        let current = $(event.currentTarget);
        if (current.hasClass('active')) {
            return
        }

        current.closest('.sub-nav').find('a').removeClass('active');
        current.addClass('active');
        let tab = current.data("tab");

        html.find(`[data-region="s-achievements"]`).removeClass('active');
        html.find(`[data-tab="${tab}"]`).addClass('active');
    })

    html.on('click', 'nav.sub-nav a[data-tab="achievements"]', (event) => {
        html.find(`a[data-tab="${party.id}"],div[data-tab="${party.id}"]`).trigger('click');
    })
}

function createAchievementImages(data) {
    return data
        .sort((a, b) => a.text.localeCompare(b.text))
        .map((a) => `<div class="portrait" data-tooltip="${a.description}" data-index=${a.idx}>${game.user.isGM ? '<i class="fas fa-edit edit"></i><i class="fas fa-times close"></i>' : ''}<img src="${a.img}"><label>${a.text}</label></div>`)
        .join("")
}
