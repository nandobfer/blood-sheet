export interface BloodDataInput {
    mnemonico: string
    idade_reduzida?: string
    idade_do_paciente_na_coleta: string
    sexo: string
    campo_1?: string
    resultado_1?: string
    campo_2?: string
    resultado_2?: string
    campo_3?: string
    resultado_3?: string
    campo_4?: string
    resultado_4?: string
    campo_5?: string
    resultado_5?: string
    campo_6?: string
    resultado_6?: string
    campo_7?: string
    resultado_7?: string
    campo_8?: string
    resultado_8?: string
    campo_9?: string
    resultado_9?: string
    campo_10?: string
    resultado_10?: string
    campo_11?: string
    resultado_11?: string
}

export interface BloodDataOutput {
    idade_reduzida: string
    idade_do_paciente_na_coleta: string
    sexo: string
    cre_resultado: string
    clearence: string
    cal_resultado: string
    vid_abbott: string
    pth_result_alinity: string
}

export type BloodField = 'CRE\nRESULTADO' | 'CAL\nRESULTADO' | 'PTH\nRESUL ALINITY' | 'VID\nABBOTT'