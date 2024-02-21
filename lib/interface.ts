export interface IUseexistingRun {
    id: number,
}

export interface ICreateNewRun {
    include_all: boolean,
    run_name: string,
    milestone_id: number,
}

export interface IStatus {
    status: {
        passed: number,
        failed: number,
        pending: number,
        skipped: number,
        expFail: number,
        fixed: number
    }
}

export interface ITestrailConfig {
    base_url: string,
    user: string,
    pass: string,
    project_id: number,
    suite_id?: number,
    testRailUpdateInterval?: number,
    updateResultAfterEachCase?: boolean,
    use_existing_run: IUseexistingRun,
    create_new_run: ICreateNewRun,
    status: IStatus,
}

export type IResult = {
    case_id: number;
    status_id: number;
    comment: string;
    elapsed: string;
    defects: string;
    version: string;
};