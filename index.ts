import Caller from "./src/caller.ts";


class VitestTestrailReporter {
    readonly caller = new Caller();


    // vitest hooks    
    onInit() {
        this.caller.onInit();
    }

    onPathsCollected(paths) {
        this.caller.onPathsCollected(paths);
    }

    onCollected(file) {
        this.caller.onCollected(file);
    }

    onTaskUpdate(packs) {
        this.caller.onTaskUpdate(packs);
    }

    onFinished(packs) {
        this.caller.onFinished(packs);
    }

}

module.exports = VitestTestrailReporter;
