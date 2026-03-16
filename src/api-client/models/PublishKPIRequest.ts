/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PublishKPIRequest = {
    kpi_name: string;
    description?: (string | null);
    business_formula?: (string | null);
    sql: string;
    category?: (string | null);
    frequency?: (string | null);
    owner_team?: (string | null);
    data_source?: (string | null);
    business_unit?: (string | null);
    complexity?: (string | null);
    quality_score?: (number | null);
    linked_assets?: (number | null);
    next_update?: (string | null);
    metadata_signature: string;
    semantic_signature: string;
    lineage_signature: string;
};

