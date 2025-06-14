const SOCKET_NAME = `module.${moduleName}`;
const SEND_ITEM = "sendItemToActor";

function executeAsGM(type, payload) {
    game.socket.emit(SOCKET_NAME, {type, payload});
}

function socketListener() {
    game.socket.on(SOCKET_NAME, async ({type, payload, userId}) => {
        if (game.user.isActiveGM) {
            switch (type) {
                case SEND_ITEM:
                    let {ownerId, targetId, itemId, qty, stack} = payload;
                    sendItemToActor(ownerId, targetId, itemId, qty, stack)
                    break;
                default:
                    console.error('Unknown socket message:' + type)
                    break;
            }
        }
    })
}