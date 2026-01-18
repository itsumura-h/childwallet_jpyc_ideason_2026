FROM ubuntu:24.04

RUN apt update
RUN apt upgrade -y
RUN apt install -y \
    curl \
    xz-utils \
    git

SHELL [ "/bin/bash", "-c" ]
WORKDIR /root

# foundry
RUN curl -L https://foundry.paradigm.xyz | bash
ENV PATH=$PATH:/root/.foundry/bin
RUN foundryup

CMD ["anvil", "--host", "0.0.0.0"]
