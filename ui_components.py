"""UI component builders for CPUsim desktop app."""
import customtkinter as ctk
import csv, random, io, os
from PIL import Image
from scheduler import ProcessInput, ALGORITHM_INFO, PRESETS, ALGORITHMS

COLORS = ["#3B82F6","#10B981","#F59E0B","#6366F1","#8B5CF6","#EC4899","#14B8A6","#F97316","#06B6D4"]
BG_DARK = "#0A0A0B"
BG_CARD = "#111114"
BG_INPUT = "#18181B"
BORDER = "#27272A"
TEXT_DIM = "#71717A"
TEXT_MID = "#A1A1AA"
BLUE = "#3B82F6"


def make_header(parent, app):
    header = ctk.CTkFrame(parent, fg_color="#0D0D10", height=50, corner_radius=0)
    header.pack(fill="x")
    header.pack_propagate(False)

    logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logo.png")
    if os.path.exists(logo_path):
        logo_img = ctk.CTkImage(Image.open(logo_path), size=(24, 24))
        ctk.CTkLabel(header, text="", image=logo_img).pack(side="left", padx=(16, 6))
        title_padx = 0
    else:
        title_padx = 16

    ctk.CTkLabel(header, text="CPUsim", font=ctk.CTkFont(size=22, weight="bold"), text_color="white").pack(side="left", padx=(title_padx, 4))
    ctk.CTkLabel(header, text="CPU Scheduling Simulator", font=ctk.CTkFont(size=11), text_color=TEXT_DIM).pack(side="left", padx=4)

    btn_frame = ctk.CTkFrame(header, fg_color="transparent")
    btn_frame.pack(side="right", padx=12)
    ctk.CTkButton(btn_frame, text="⚙ Settings", width=80, height=28, fg_color=BG_INPUT, border_width=1, border_color=BORDER, text_color=TEXT_MID, hover_color="#27272A", font=ctk.CTkFont(size=10, weight="bold"), command=app.open_settings_window).pack(side="right", padx=4)
    ctk.CTkButton(btn_frame, text="⬇ CSV", width=60, height=28, fg_color=BG_INPUT, border_width=1, border_color=BORDER, text_color=TEXT_MID, hover_color="#27272A", font=ctk.CTkFont(size=10, weight="bold"), command=app._export_csv).pack(side="right", padx=4)
    ctk.CTkButton(btn_frame, text="🎲 Random", width=80, height=28, fg_color=BG_INPUT, border_width=1, border_color=BORDER, text_color=TEXT_MID, hover_color="#27272A", font=ctk.CTkFont(size=10, weight="bold"), command=app._random_processes).pack(side="right", padx=4)

    app.preset_var = ctk.StringVar(value="Presets")
    ctk.CTkOptionMenu(btn_frame, variable=app.preset_var, values=list(PRESETS.keys()), fg_color=BG_INPUT, button_color="#27272A", width=110, height=28, font=ctk.CTkFont(size=10), command=app._load_preset).pack(side="right", padx=4)


def make_sidebar(parent, app):
    sidebar = ctk.CTkScrollableFrame(parent, fg_color=BG_DARK, width=280)
    sidebar.grid(row=0, column=0, sticky="ns", padx=(0, 8))

    # Config card
    card1 = ctk.CTkFrame(sidebar, fg_color=BG_CARD, corner_radius=10, border_width=1, border_color=BORDER)
    card1.pack(fill="x", pady=(0, 6))
    ctk.CTkLabel(card1, text="CONFIGURATION", font=ctk.CTkFont(size=9, weight="bold"), text_color=TEXT_DIM).pack(anchor="w", padx=12, pady=(10, 2))
    ctk.CTkLabel(card1, text="Algorithm", font=ctk.CTkFont(size=10), text_color=TEXT_DIM).pack(anchor="w", padx=12)
    ctk.CTkOptionMenu(card1, variable=app.algorithm, values=ALGORITHMS, fg_color=BG_INPUT, button_color=BLUE, width=255).pack(padx=12, pady=4)
    app.quantum_frame = ctk.CTkFrame(card1, fg_color=BG_CARD)
    app.quantum_frame.pack(fill="x", padx=12, pady=(0, 10))

    # Algorithm info
    app.info_frame = ctk.CTkFrame(sidebar, fg_color="#0D1525", corner_radius=10, border_width=1, border_color="#1E3A5A")
    app.info_frame.pack(fill="x", pady=(0, 6))
    app.info_name_lbl = ctk.CTkLabel(app.info_frame, text="", font=ctk.CTkFont(size=12, weight="bold"), text_color="white")
    app.info_name_lbl.pack(anchor="w", padx=12, pady=(10, 0))
    app.info_type_lbl = ctk.CTkLabel(app.info_frame, text="", font=ctk.CTkFont(size=9, weight="bold"), text_color="#60A5FA")
    app.info_type_lbl.pack(anchor="w", padx=12)
    app.info_desc_lbl = ctk.CTkLabel(app.info_frame, text="", font=ctk.CTkFont(size=10), text_color=TEXT_MID, wraplength=240, justify="left")
    app.info_desc_lbl.pack(anchor="w", padx=12, pady=(2, 10))

    # Process list
    card2 = ctk.CTkFrame(sidebar, fg_color=BG_CARD, corner_radius=10, border_width=1, border_color=BORDER)
    card2.pack(fill="x", pady=(0, 6))
    ctk.CTkLabel(card2, text="PROCESS WORKLOAD", font=ctk.CTkFont(size=9, weight="bold"), text_color=TEXT_DIM).pack(anchor="w", padx=12, pady=(10, 4))
    app.process_list_frame = ctk.CTkFrame(card2, fg_color=BG_CARD)
    app.process_list_frame.pack(fill="x", padx=12, pady=2)
    app.add_form = ctk.CTkFrame(card2, fg_color=BG_CARD)
    app.add_form.pack(fill="x", padx=12, pady=(0, 10))

    # Stats card
    stats = ctk.CTkFrame(sidebar, fg_color="transparent", corner_radius=10)
    stats.pack(fill="x", pady=(0, 6))

    stats_top = ctk.CTkFrame(stats, fg_color="#0F1D3D", corner_radius=10, border_width=1, border_color="#1E3A8A")
    stats_top.pack(fill="x")

    grid = ctk.CTkFrame(stats_top, fg_color="transparent")
    grid.pack(fill="x", padx=10, pady=10)
    grid.columnconfigure((0, 1), weight=1)

    for i, (label, attr) in enumerate([("AVG WAIT", "avg_wt_label"), ("AVG TAT", "avg_tat_label"), ("AVG RESPONSE", "avg_rt_label"), ("CPU UTIL", "cpu_util_label")]):
        r, c = divmod(i, 2)
        f = ctk.CTkFrame(grid, fg_color="transparent")
        f.grid(row=r, column=c, padx=4, pady=4, sticky="ew")
        ctk.CTkLabel(f, text=label, font=ctk.CTkFont(size=8, weight="bold"), text_color="#93C5FD").pack()
        lbl = ctk.CTkLabel(f, text="0.00", font=ctk.CTkFont(size=22, weight="bold"), text_color="white")
        lbl.pack()
        setattr(app, attr, lbl)

    extra = ctk.CTkFrame(stats_top, fg_color="transparent")
    extra.pack(fill="x", padx=12, pady=(0, 10))
    app.throughput_lbl = ctk.CTkLabel(extra, text="Throughput: 0.000/ms", font=ctk.CTkFont(size=9), text_color="#60A5FA")
    app.throughput_lbl.pack(side="left")
    app.ctx_lbl = ctk.CTkLabel(extra, text="Ctx Switches: 0", font=ctk.CTkFont(size=9), text_color="#60A5FA")
    app.ctx_lbl.pack(side="right")

    return sidebar


def make_main_area(parent, app):
    from matplotlib.figure import Figure
    from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg

    right = ctk.CTkFrame(parent, fg_color=BG_DARK)
    right.grid(row=0, column=1, sticky="nsew")
    right.rowconfigure(0, weight=0)
    right.rowconfigure(1, weight=1)
    right.rowconfigure(2, weight=2)
    right.columnconfigure(0, weight=1)

    # Gantt section
    gantt_card = ctk.CTkFrame(right, fg_color=BG_CARD, corner_radius=10, border_width=1, border_color=BORDER)
    gantt_card.grid(row=0, column=0, sticky="nsew", pady=(0, 6))

    gantt_header = ctk.CTkFrame(gantt_card, fg_color="transparent")
    gantt_header.pack(fill="x", padx=12, pady=(8, 0))
    ctk.CTkLabel(gantt_header, text="GANTT CHART TIMELINE", font=ctk.CTkFont(size=9, weight="bold"), text_color=TEXT_DIM).pack(side="left")

    controls = ctk.CTkFrame(gantt_header, fg_color="transparent")
    controls.pack(side="right")
    for txt, cmd in [("⏮", app._step_back), ("▶", app._toggle_play), ("⏭", app._step_fwd), ("⟲", app._reset_play)]:
        attr_name = "play_btn" if txt == "▶" else None
        btn = ctk.CTkButton(controls, text=txt, width=28, height=24, fg_color=BG_INPUT, hover_color="#27272A", text_color=TEXT_MID, font=ctk.CTkFont(size=12), command=cmd)
        btn.pack(side="left", padx=1)
        if attr_name:
            app.play_btn = btn

    app.speed_var = ctk.StringVar(value="1x")
    ctk.CTkOptionMenu(controls, variable=app.speed_var, values=["1x", "2x", "4x", "8x"], fg_color=BG_INPUT, button_color="#27272A", width=50, height=24, font=ctk.CTkFont(size=9)).pack(side="left", padx=4)
    app.tick_label = ctk.CTkLabel(controls, text="t=0/0", font=ctk.CTkFont(size=9), text_color=TEXT_DIM)
    app.tick_label.pack(side="left", padx=4)

    app.gantt_fig = Figure(figsize=(8, 1.6), facecolor=BG_CARD)
    app.gantt_ax = app.gantt_fig.add_subplot(111)
    app.gantt_canvas = FigureCanvasTkAgg(app.gantt_fig, master=gantt_card)
    app.gantt_canvas.get_tk_widget().pack(fill="both", expand=True, padx=8, pady=(0, 2))

    app.gantt_slider = ctk.CTkSlider(gantt_card, from_=0, to=1, number_of_steps=1, fg_color=BORDER, progress_color=BLUE, button_color=BLUE, button_hover_color="#2563EB", height=14, command=app._on_slider)
    app.gantt_slider.set(0)
    app.gantt_slider.pack(fill="x", padx=12, pady=(0, 4))

    # State display
    app.state_frame = ctk.CTkFrame(gantt_card, fg_color="transparent")
    app.state_frame.pack(fill="x", padx=12, pady=(0, 8))

    # Ready queue row
    rq_row = ctk.CTkFrame(right, fg_color=BG_CARD, corner_radius=10, border_width=1, border_color=BORDER, height=40)
    rq_row.grid(row=1, column=0, sticky="nsew", pady=(0, 6))
    rq_row.pack_propagate(False)
    app.ready_queue_frame = ctk.CTkFrame(rq_row, fg_color="transparent")
    app.ready_queue_frame.pack(fill="both", expand=True, padx=8, pady=4)

    # Bottom: table + chart
    bottom = ctk.CTkFrame(right, fg_color=BG_DARK)
    bottom.grid(row=2, column=0, sticky="nsew")
    bottom.columnconfigure(0, weight=2)
    bottom.columnconfigure(1, weight=1)
    bottom.rowconfigure(0, weight=1)

    table_card = ctk.CTkFrame(bottom, fg_color=BG_CARD, corner_radius=10, border_width=1, border_color=BORDER)
    table_card.grid(row=0, column=0, sticky="nsew", padx=(0, 6))
    ctk.CTkLabel(table_card, text="QUANTITATIVE ANALYSIS", font=ctk.CTkFont(size=9, weight="bold"), text_color=TEXT_DIM).pack(anchor="w", padx=12, pady=(8, 0))
    app.table_frame = ctk.CTkScrollableFrame(table_card, fg_color=BG_CARD)
    app.table_frame.pack(fill="both", expand=True, padx=8, pady=(2, 8))

    comp_card = ctk.CTkFrame(bottom, fg_color=BG_CARD, corner_radius=10, border_width=1, border_color=BORDER)
    comp_card.grid(row=0, column=1, sticky="nsew")
    ctk.CTkLabel(comp_card, text="ALGORITHM COMPARISON", font=ctk.CTkFont(size=9, weight="bold"), text_color=TEXT_DIM).pack(anchor="w", padx=12, pady=(8, 0))
    app.comp_fig = Figure(figsize=(4, 3), facecolor=BG_CARD)
    app.comp_ax = app.comp_fig.add_subplot(111)
    app.comp_canvas = FigureCanvasTkAgg(app.comp_fig, master=comp_card)
    app.comp_canvas.get_tk_widget().pack(fill="both", expand=True, padx=8, pady=(0, 8))

    return right
