/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DashboardSummary } from '../models/DashboardSummary';
import type { DQCheckRequest } from '../models/DQCheckRequest';
import type { DraftCreate } from '../models/DraftCreate';
import type { ExecuteQueryRequest } from '../models/ExecuteQueryRequest';
import type { GenieQueryRequest } from '../models/GenieQueryRequest';
import type { KPIDetail } from '../models/KPIDetail';
import type { KPIResponse } from '../models/KPIResponse';
import type { PublishKPIRequest } from '../models/PublishKPIRequest';
import type { QueryPreparationRequest } from '../models/QueryPreparationRequest';
import type { TableListResponse } from '../models/TableListResponse';
import type { TablePreviewResponse } from '../models/TablePreviewResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * Get Dashboard Summary
     * @returns DashboardSummary Successful Response
     * @throws ApiError
     */
    public static getDashboardSummaryDashboardSummaryGet(): CancelablePromise<DashboardSummary> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/dashboard/summary',
        });
    }
    /**
     * List Kpis
     * @param userId
     * @returns KPIResponse Successful Response
     * @throws ApiError
     */
    public static listKpisKpisGet(
        userId: string,
    ): CancelablePromise<Array<KPIResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/kpis',
            query: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Kpi Detail
     * @param kpiId
     * @returns KPIDetail Successful Response
     * @throws ApiError
     */
    public static getKpiDetailKpisKpiIdGet(
        kpiId: string,
    ): CancelablePromise<KPIDetail> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/kpis/{kpi_id}',
            path: {
                'kpi_id': kpiId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Toggle Favorite
     * @param kpiId
     * @param userId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static toggleFavoriteKpisKpiIdFavoritePost(
        kpiId: string,
        userId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/kpis/{kpi_id}/favorite',
            path: {
                'kpi_id': kpiId,
            },
            query: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Draft
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static createDraftDraftsPost(
        requestBody: DraftCreate,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/drafts',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Drafts
     * @param userId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static listDraftsDraftsGet(
        userId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/drafts',
            query: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Publish Kpi
     * @param draftId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static publishKpiDraftsDraftIdPublishPost(
        draftId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/drafts/{draft_id}/publish',
            path: {
                'draft_id': draftId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Tables
     * Get all tables + column definitions for selected schema
     * @param schema
     * @returns TableListResponse Successful Response
     * @throws ApiError
     */
    public static listTablesDatasourceTablesGet(
        schema: string = 'gold_plus_datamart',
    ): CancelablePromise<TableListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/datasource/tables',
            query: {
                'schema': schema,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Preview Table
     * Get top 10 preview rows from selected table
     * @param schema
     * @param table
     * @returns TablePreviewResponse Successful Response
     * @throws ApiError
     */
    public static previewTableDatasourcePreviewGet(
        schema: string,
        table: string,
    ): CancelablePromise<TablePreviewResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/datasource/preview',
            query: {
                'schema': schema,
                'table': table,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Optimize Query
     * Accept RAW SQL directly in body (no JSON escaping needed)
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static optimizeQueryQueryOptimizePost(
        requestBody: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/query/optimize',
            body: requestBody,
            mediaType: 'text/plain',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Generate Sql With Genie
     * Generate SQL using Databricks Genie
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static generateSqlWithGenieQueryGeniePost(
        requestBody: GenieQueryRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/query/genie',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Execute Query
     * Execute SQL and return preview rows
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static executeQueryQueryRunPost(
        requestBody: ExecuteQueryRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/query/run',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Query Preparation
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static queryPreparationKpiQueryPreparationPost(
        requestBody: QueryPreparationRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/kpi/query-preparation',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Run Dq Checks
     * Full enterprise Data Quality validation
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static runDqChecksKpiDataQualityPost(
        requestBody: DQCheckRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/kpi/data-quality',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Publish Final Kpi
     * Insert KPI into kpi_master + kpi_values
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static publishFinalKpiKpiPublishFinalPost(
        requestBody: PublishKPIRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/kpi/publish-final',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Root
     * @returns any Successful Response
     * @throws ApiError
     */
    public static rootGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/',
        });
    }
    /**
     * Spa
     * @param fullPath
     * @returns any Successful Response
     * @throws ApiError
     */
    public static spaFullPathGet(
        fullPath: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/{full_path}',
            path: {
                'full_path': fullPath,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
