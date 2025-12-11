from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):
    dependencies = [
        ("cadastros", "0002_classificacao_profissional"),
    ]

    operations = [
        migrations.AddField(
            model_name="profissional",
            name="banco_agencia",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="profissional",
            name="banco_conta",
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name="profissional",
            name="banco_nome",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="profissional",
            name="cnae",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="profissional",
            name="celular",
            field=models.CharField(
                blank=True,
                max_length=20,
                validators=[
                    django.core.validators.RegexValidator(
                        "^\\+55\\d{10,11}$", "Use o formato +55DDxxxxxxxxx."
                    )
                ],
            ),
        ),
        migrations.AddField(
            model_name="profissional",
            name="cnpj",
            field=models.CharField(
                blank=True,
                max_length=18,
                validators=[
                    django.core.validators.RegexValidator(
                        "^\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2}$",
                        "CNPJ deve conter 14 dígitos.",
                    )
                ],
            ),
        ),
        migrations.AddField(
            model_name="profissional",
            name="comissao_sabado",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Comissão sobre sábados",
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="profissional",
            name="cpf",
            field=models.CharField(
                blank=True,
                max_length=14,
                validators=[
                    django.core.validators.RegexValidator(
                        "^\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}$",
                        "CPF deve conter 11 dígitos.",
                    )
                ],
            ),
        ),
        migrations.AddField(
            model_name="profissional",
            name="data_contrato",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="profissional",
            name="endereco_empresa",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="profissional",
            name="inscricao_municipal",
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name="profissional",
            name="link_contrato",
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name="profissional",
            name="nome_empresarial",
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name="profissional",
            name="valor_diaria",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Diária (MEI/Freelancer)",
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="profissional",
            name="valor_salario_mensal",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Salário (Estagiária)",
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="profissional",
            name="valor_vale_transporte",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Apenas estagiária",
                max_digits=10,
                null=True,
            ),
        ),
    ]
