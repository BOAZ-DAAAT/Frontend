from pathlib import Path

import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
from matplotlib import font_manager
from matplotlib.ticker import FuncFormatter


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "src/features/playground/report/assets/demo"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

FONT_PATH = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
font_manager.fontManager.addfont(FONT_PATH)
FONT_NAME = font_manager.FontProperties(fname=FONT_PATH).get_name()

mpl.rcParams.update({
    "font.family": FONT_NAME,
    "axes.unicode_minus": False,
    "figure.facecolor": "#FFFFFF",
    "axes.facecolor": "#FFFFFF",
    "axes.edgecolor": "#D8E1EC",
    "axes.labelcolor": "#455266",
    "axes.titlecolor": "#182334",
    "xtick.color": "#647184",
    "ytick.color": "#647184",
    "text.color": "#182334",
    "grid.color": "#E8EEF5",
    "grid.linewidth": 0.8,
})

INK = "#182334"
MUTED = "#647184"
BLUE = "#4C78A8"
CYAN = "#36C5D8"
TEAL = "#26A69A"
RED = "#D95F5F"
AMBER = "#E4A548"
GRID = "#E8EEF5"


def finish(fig: plt.Figure, filename: str) -> None:
    fig.savefig(
        OUTPUT_DIR / filename,
        dpi=200,
        bbox_inches="tight",
        facecolor="#FFFFFF",
        pad_inches=0.18,
    )
    plt.close(fig)


def delay_score_chart() -> None:
    labels = ["정시·조기", "1–2일", "3–5일", "6–9일", "10일+"]
    counts = np.array([8420, 3920, 2140, 910, 410])
    scores = np.array([4.42, 4.18, 3.83, 3.47, 3.08])
    ci = np.array([0.02, 0.03, 0.05, 0.07, 0.10])
    x = np.arange(len(labels))

    fig, ax_score = plt.subplots(figsize=(8.8, 4.7))
    ax_count = ax_score.twinx()

    bars = ax_count.bar(
        x,
        counts,
        width=0.62,
        color="#DDE8F4",
        edgecolor="#C7D7E8",
        linewidth=0.8,
        zorder=1,
    )
    ax_score.errorbar(
        x,
        scores,
        yerr=ci,
        color=BLUE,
        marker="o",
        markersize=7,
        markerfacecolor="#FFFFFF",
        markeredgewidth=2,
        linewidth=2.4,
        capsize=4,
        zorder=4,
    )

    ax_score.set_title("배송 지연 구간별 평균 리뷰 평점", loc="left", fontsize=15, fontweight=700, pad=16)
    ax_score.text(
        0,
        1.02,
        "점은 평균 평점, 오차막대는 95% 신뢰구간 · 막대는 리뷰가 연결된 주문 수",
        transform=ax_score.transAxes,
        color=MUTED,
        fontsize=9.5,
    )
    ax_score.set_ylabel("평균 리뷰 평점")
    ax_score.set_ylim(2.8, 4.7)
    ax_score.set_yticks([3.0, 3.5, 4.0, 4.5])
    ax_score.set_xticks(x, labels)
    ax_score.grid(axis="y", zorder=0)
    ax_score.spines[["top", "right"]].set_visible(False)

    ax_count.set_ylabel("주문 수", color=MUTED)
    ax_count.set_ylim(0, 10000)
    ax_count.yaxis.set_major_formatter(FuncFormatter(lambda value, _: f"{int(value / 1000)}k"))
    ax_count.spines[["top", "left"]].set_visible(False)
    ax_count.tick_params(axis="y", colors=MUTED)

    for bar, count in zip(bars, counts):
        ax_count.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 180,
            f"n={count:,}",
            ha="center",
            va="bottom",
            fontsize=8.5,
            color=MUTED,
        )
    for xi, score in zip(x, scores):
        ax_score.text(
            xi,
            score + 0.10,
            f"{score:.2f}",
            ha="center",
            va="bottom",
            fontsize=9,
            fontweight=700,
            color=INK,
        )

    fig.tight_layout()
    finish(fig, "delay-score-by-bin.png")


def adjusted_effect_chart() -> None:
    labels = ["1–2일 지연", "3–5일 지연", "6–9일 지연", "10일 이상"]
    estimates = np.array([-0.18, -0.47, -0.76, -1.09])
    lower = np.array([-0.22, -0.53, -0.86, -1.24])
    upper = np.array([-0.14, -0.41, -0.66, -0.94])
    y = np.arange(len(labels))[::-1]

    fig, ax = plt.subplots(figsize=(8.8, 4.5))
    ax.axvline(0, color="#A9B6C5", linewidth=1.2)
    ax.hlines(y, lower, upper, color=BLUE, linewidth=3)
    ax.scatter(estimates, y, s=74, color=BLUE, edgecolor="#FFFFFF", linewidth=1.5, zorder=3)

    ax.set_title("공변량 조정 후 리뷰 평점 차이", loc="left", fontsize=15, fontweight=700, pad=16)
    ax.text(
        0,
        1.02,
        "기준: 정시·조기 배송 · 판매자 고정효과와 카테고리·지역·가격·시즌을 통제한 선형모형",
        transform=ax.transAxes,
        color=MUTED,
        fontsize=9.5,
    )
    ax.set_yticks(y, labels)
    ax.set_xlabel("정시 배송 대비 평점 차이 (점)")
    ax.set_xlim(-1.35, 0.12)
    ax.grid(axis="x")
    ax.spines[["top", "right", "left"]].set_visible(False)
    ax.tick_params(axis="y", length=0)

    for estimate, yi in zip(estimates, y):
        ax.text(
            estimate - 0.04,
            yi + 0.18,
            f"{estimate:.2f}",
            ha="right",
            va="center",
            fontsize=9,
            fontweight=700,
            color=INK,
        )

    fig.tight_layout()
    finish(fig, "adjusted-review-effect.png")


def seller_risk_chart() -> None:
    sellers = [
        "S-014", "S-021", "S-033", "S-041", "S-052", "S-067",
        "S-074", "S-086", "S-091", "S-103", "S-118", "S-126",
        "S-139", "S-147", "S-155", "S-162", "S-174", "S-186",
    ]
    volume = np.array([1280, 940, 760, 610, 880, 520, 470, 690, 430, 790, 560, 1010, 380, 720, 640, 450, 830, 590])
    breach = np.array([0.34, 0.29, 0.18, 0.41, 0.22, 0.37, 0.16, 0.27, 0.45, 0.20, 0.31, 0.24, 0.39, 0.15, 0.28, 0.43, 0.19, 0.33])
    score_loss = np.array([0.48, 0.42, 0.25, 0.55, 0.31, 0.50, 0.20, 0.38, 0.62, 0.28, 0.44, 0.34, 0.57, 0.18, 0.41, 0.59, 0.27, 0.46])
    size = 55 + volume / 6
    median_volume = 650
    risk_line = 0.30

    fig, ax = plt.subplots(figsize=(8.8, 5.2))
    scatter = ax.scatter(
        volume,
        breach * 100,
        s=size,
        c=score_loss,
        cmap=mpl.colors.LinearSegmentedColormap.from_list("risk", ["#7EC8D8", "#E4A548", "#D95F5F"]),
        vmin=0.15,
        vmax=0.65,
        alpha=0.9,
        edgecolor="#FFFFFF",
        linewidth=1,
    )
    ax.axvline(median_volume, color="#A9B6C5", linestyle="--", linewidth=1)
    ax.axhline(risk_line * 100, color="#A9B6C5", linestyle="--", linewidth=1)
    ax.fill_betweenx([risk_line * 100, 50], median_volume, 1350, color="#F7E6E6", alpha=0.55, zorder=0)

    priorities = {"S-014", "S-021", "S-041", "S-118", "S-186"}
    for seller, x, y in zip(sellers, volume, breach * 100):
        if seller in priorities:
            ax.annotate(
                seller,
                (x, y),
                xytext=(6, 6),
                textcoords="offset points",
                fontsize=8.5,
                fontweight=700,
                color=INK,
            )

    ax.text(1325, 48.2, "우선 개입 영역", ha="right", va="top", color=RED, fontsize=9, fontweight=700)
    ax.set_title("판매자 SLA 위험 사분면", loc="left", fontsize=15, fontweight=700, pad=16)
    ax.text(
        0,
        1.02,
        "점 크기: 분석 주문 수 · 색상: 지연 주문의 평균 평점 손실 · 라벨: 우선 검토 판매자",
        transform=ax.transAxes,
        color=MUTED,
        fontsize=9.5,
    )
    ax.set_xlabel("분석 주문 수")
    ax.set_ylabel("3일 이상 지연 비율")
    ax.set_xlim(300, 1350)
    ax.set_ylim(10, 50)
    ax.yaxis.set_major_formatter(FuncFormatter(lambda value, _: f"{value:.0f}%"))
    ax.grid(zorder=0)
    ax.spines[["top", "right"]].set_visible(False)

    colorbar = fig.colorbar(scatter, ax=ax, pad=0.02, fraction=0.035)
    colorbar.set_label("평균 평점 손실")
    colorbar.outline.set_visible(False)
    fig.tight_layout()
    finish(fig, "seller-risk-quadrant.png")


def intervention_chart() -> None:
    labels = ["사전 지연 알림", "고위험 주문 우선출고", "판매자 SLA 코칭", "결합 정책"]
    prevented = np.array([112, 196, 247, 326])
    lower = np.array([80, 150, 191, 251])
    upper = np.array([144, 242, 303, 401])
    cost = np.array([1.8, 12.4, 8.1, 18.9])
    y = np.arange(len(labels))[::-1]
    colors = [CYAN, BLUE, TEAL, INK]

    fig, ax = plt.subplots(figsize=(8.8, 4.8))
    bars = ax.barh(y, prevented, color=colors, height=0.58)
    ax.errorbar(
        prevented,
        y,
        xerr=np.vstack([prevented - lower, upper - prevented]),
        fmt="none",
        ecolor="#455266",
        elinewidth=1.2,
        capsize=3,
    )

    ax.set_title("정책 시나리오별 저평점 리뷰 감소 추정", loc="left", fontsize=15, fontweight=700, pad=16)
    ax.text(
        0,
        1.02,
        "주문 1만 건당 방지 가능한 1–2점 리뷰 수 · 오차막대는 모수 불확실성을 반영한 95% 구간",
        transform=ax.transAxes,
        color=MUTED,
        fontsize=9.5,
    )
    ax.set_yticks(y, labels)
    ax.set_xlabel("방지 가능한 저평점 리뷰 수 / 주문 1만 건")
    ax.set_xlim(0, 450)
    ax.grid(axis="x", zorder=0)
    ax.spines[["top", "right", "left"]].set_visible(False)
    ax.tick_params(axis="y", length=0)

    for bar, value, scenario_cost in zip(bars, prevented, cost):
        ax.text(
            value + 10,
            bar.get_y() + bar.get_height() / 2,
            f"{value}건 · 비용 {scenario_cost:.1f}백만원",
            va="center",
            fontsize=9,
            fontweight=700,
            color=INK,
        )

    fig.tight_layout()
    finish(fig, "intervention-scenarios.png")


if __name__ == "__main__":
    delay_score_chart()
    adjusted_effect_chart()
    seller_risk_chart()
    intervention_chart()
    print(f"Generated report charts in {OUTPUT_DIR}")
