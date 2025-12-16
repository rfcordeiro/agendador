from __future__ import annotations

from datetime import time

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("cadastros", "0008_alter_capacidadesala_dia_semana"),
    ]

    operations = [
        migrations.AddField(
            model_name="local",
            name="tipo",
            field=models.CharField(
                choices=[
                    ("associacao", "Associação"),
                    ("evento", "Evento"),
                    ("clinica", "Clínica"),
                ],
                default="clinica",
                help_text="Define se o local é associação, evento ou clínica.",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="local",
            name="manha_inicio",
            field=models.TimeField(
                default=time(8, 0), help_text="Início do turno da manhã."
            ),
        ),
        migrations.AddField(
            model_name="local",
            name="manha_fim",
            field=models.TimeField(
                default=time(14, 0), help_text="Fim do turno da manhã."
            ),
        ),
        migrations.AddField(
            model_name="local",
            name="tarde_inicio",
            field=models.TimeField(
                default=time(14, 0), help_text="Início do turno da tarde."
            ),
        ),
        migrations.AddField(
            model_name="local",
            name="tarde_fim",
            field=models.TimeField(
                default=time(20, 0), help_text="Fim do turno da tarde."
            ),
        ),
        migrations.AddField(
            model_name="local",
            name="sabado_inicio",
            field=models.TimeField(default=time(9, 0), help_text="Início do sábado."),
        ),
        migrations.AddField(
            model_name="local",
            name="sabado_fim",
            field=models.TimeField(default=time(14, 0), help_text="Fim do sábado."),
        ),
    ]
