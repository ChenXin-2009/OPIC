# -*- coding: utf-8 -*-
"""
生成多语言README文件的脚本
根据中文README.md生成其他语言版本
"""

import os

# 定义翻译内容
translations = {
    'es': {
        'title': 'OPIC — Open Integrated Cosmos (Cosmos Integrado Abierto)',
        'subtitle': 'Un sistema de visualización del universo a múltiples escalas e integración de datos astronómicos basado en web',
        'note': '',
        'overview_title': '## Descripción del proyecto',
        'overview': 'OPIC es una aplicación de visualización interactiva del universo construida con Three.js, Cesium y Next.js. Utilizando datos astronómicos reales y cálculos orbitales precisos, presenta una simulación dinámica desde la superficie de la Tierra hasta el borde del universo observable.\n\nEl proyecto está evolucionando hacia una arquitectura modular de plugins (MOD Manager), permitiendo que las funciones se carguen, configuren y cambien independientemente en tiempo de ejecución sin reiniciar la aplicación.',
    },
    'fr': {
        'title': 'OPIC — Open Integrated Cosmos (Cosmos Intégré Ouvert)',
        'subtitle': 'Un système de visualisation de l\'univers multi-échelle et d\'intégration de données astronomiques basé sur le Web',
    },
    'de': {
        'title': 'OPIC — Open Integrated Cosmos (Offener Integrierter Kosmos)',
        'subtitle': 'Ein webbasiertes Multi-Skalen-Universum-Visualisierungs- und astronomisches Datenintegrationssystem',
    },
    'ru': {
        'title': 'OPIC — Open Integrated Cosmos (Открытый Интегрированный Космос)',
        'subtitle': 'Веб-система визуализации вселенной в нескольких масштабах и интеграции астрономических данных',
    }
}

print("此脚本用于生成多语言README文件")
print("请手动翻译每个语言版本以确保质量")
